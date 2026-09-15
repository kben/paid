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
            const value = leistung.einzelpreis * leistung.anzahl;
            const zuzahlungsbetrag = calculateZuzahlungsbetrag(leistung);
            const mehrwertsteuer = calculateMehrwehrtsteuer(leistung);
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
        const nettoCent = Math.round(amounts.rechnungsbetrag * 100);
        const kasseCent = Math.round(nettoCent / 2);
        amounts.rechnungsbetrag = kasseCent / 100;
        amounts.beihilfebetrag = (nettoCent - kasseCent) / 100;
    }

    return amounts;
};

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