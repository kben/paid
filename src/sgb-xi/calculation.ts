/** based on document: Pflege, Technische Anlage 1 für Abrechnung auf maschinell verwertbaren Datenträgern
  * see docs/documents.md for more info
  */

import {
    Invoice,
    Abrechnungsfall,
    Pflegehilfsmittel,
    Leistung
} from "./types";
import { MehrwertsteuerSchluessel } from "./codes";

const mehrwertsteuersaetze: Record<MehrwertsteuerSchluessel, number> = {
    "": 0,
    "1": 0.19,
    "2": 0.07
};

export const calculateInvoice = (invoice: Invoice) => invoice.faelle
    .reduce((result, fall) => {
        const amounts = calculateFall(fall);
        result.gesamtbruttobetrag += amounts.gesamtbruttobetrag;
        result.rechnungsbetrag += amounts.rechnungsbetrag;
        result.zuzahlungsbetrag += amounts.zuzahlungsbetrag;
        result.beihilfebetrag += amounts.beihilfebetrag;
        result.mehrwertsteuerbetrag += amounts.mehrwertsteuerbetrag;
        return result;
    }, makeAmounts());

export const calculateFall = (fall: Abrechnungsfall) => {
    const amounts = fall.einsaetze
        .flatMap(einsatz => einsatz.leistungen)
        .reduce((result, leistung) => {
            // Jeder Betrag wird je Leistung auf ganze Cent gerundet, bevor er in die
            // Fallsumme eingeht: Die Pflegekasse rechnet Einzelpreis × Anzahl Position
            // für Position nach, und genauso entstehen auch die Rechnungszeilen im
            // vorgelagerten System. Bei gebrochener Anzahl (eine an einer Budgetgrenze
            // angebrochene Leistung) läge sonst ein halber Cent zwischen Rechnung und
            // Datei. § 302 SGB V rundet aus demselben Grund ebenso, siehe
            // calculateBruttobetrag in src/sgb-v/calculations.ts.
            // Weil damit jeder Fallwert ein exakter Cent ist, ergibt die Summe der
            // Fallbeträge (IAF) konstruktionsbedingt wieder den Gesamtbetrag (GES).
            const value = roundCent(leistung.einzelpreis * leistung.anzahl);
            const zuzahlungsbetrag = roundCent(calculateZuzahlungsbetrag(leistung));
            const mehrwertsteuer = roundCent(calculateMehrwehrtsteuer(leistung));
            const gesamtbruttobetrag = value + mehrwertsteuer;
            result.gesamtbruttobetrag += gesamtbruttobetrag;
            result.rechnungsbetrag += gesamtbruttobetrag - zuzahlungsbetrag;
            result.zuzahlungsbetrag += zuzahlungsbetrag;
            result.mehrwertsteuerbetrag += mehrwertsteuer;
            return result;
        }, makeAmounts());

    if (fall.beihilfeberechtigt) {
        // § 28 Abs. 2 SGB XI: Bei Beihilfeberechtigten übernimmt die Pflegekasse die
        // zustehenden Leistungen nur zur Hälfte; die andere Hälfte trägt die Beihilfe.
        // Geteilt wird der Nettobetrag des ganzen Falls (nach Zuzahlung) in ganzen Cent:
        // Die Pflegekasse trägt die kaufmännisch gerundete Hälfte, die Beihilfe den Rest.
        // So ergeben Rechnungsbetrag und Beihilfebetrag zusammen immer wieder den
        // Gesamtbetrag — anders als bei einer Rundung beider Hälften für sich.
        // Gerundet wird über den Betrag (Math.sign · Math.abs), damit auch Gutschriften
        // mit negativen Beträgen dieselbe Hälfte ergeben wie die Rechnung.
        const nettoCent = Math.round(amounts.rechnungsbetrag * 100);
        const kasseCent = Math.sign(nettoCent) * Math.round(Math.abs(nettoCent) / 2);
        amounts.rechnungsbetrag = kasseCent / 100;
        amounts.beihilfebetrag = (nettoCent - kasseCent) / 100;
    }

    // Die Summen selbst noch einmal auf ganze Cent normieren: Die Addition von
    // Cent-Beträgen als Fließkommazahl hinterlässt ein Rauschen weit hinter der
    // zweiten Nachkommastelle (0,01 + 0,02 = 0,030000000000000002).
    amounts.gesamtbruttobetrag = roundCent(amounts.gesamtbruttobetrag);
    amounts.rechnungsbetrag = roundCent(amounts.rechnungsbetrag);
    amounts.zuzahlungsbetrag = roundCent(amounts.zuzahlungsbetrag);
    amounts.beihilfebetrag = roundCent(amounts.beihilfebetrag);
    amounts.mehrwertsteuerbetrag = roundCent(amounts.mehrwertsteuerbetrag);

    return amounts;
};

/** Auf ganze Cent runden. Das "+ 0" macht aus einer negativen Null eine positive,
 *  damit kein Betrag als "-0,00" in der Datei landet. */
const roundCent = (value: number): number => Math.round(100 * value) / 100 + 0;

const calculateZuzahlungsbetrag = (leistung: Leistung): number => {
    if (leistung.verguetungsart == "05") {
        return leistung.hilfsmittel.gesetzlicheZuzahlungBetrag || 0;
    } else {
        return 0;
    }
};

const calculateMehrwehrtsteuer = (leistung: Leistung): number => {
    if (leistung.verguetungsart == "05") {
        return calculateHilfsmittelMehrwertsteuer(leistung.einzelpreis, leistung.hilfsmittel);
    } else {
        return 0;
    }
};

export const calculateHilfsmittelMehrwertsteuer = (
    einzelpreis: number,
    hilfsmittel?: Pflegehilfsmittel
) => einzelpreis * mehrwertsteuersaetze[hilfsmittel?.mehrwertsteuerart || ""];

const makeAmounts = () => ({
    gesamtbruttobetrag: 0,
    rechnungsbetrag: 0,
    zuzahlungsbetrag: 0,
    beihilfebetrag: 0,
    mehrwertsteuerbetrag: 0,
});