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
    // § 28 Abs. 2 SGB XI: Bei Beihilfeberechtigten übernimmt die Pflegekasse die
    // zustehenden Leistungen nur zur Hälfte; die andere Hälfte trägt die Beihilfe.
    const beihilfefaktor = fall.beihilfeberechtigt ? 0.5 : 0;
    return fall.einsaetze
        .flatMap(einsatz => einsatz.leistungen)
        .reduce((result, leistung) => {
            const value = leistung.einzelpreis * leistung.anzahl;
            const zuzahlungsbetrag = calculateZuzahlungsbetrag(leistung);
            const mehrwertsteuer = calculateMehrwehrtsteuer(leistung);
            const gesamtbruttobetrag = value + mehrwertsteuer;
            // Beihilfebetrag = halber Nettobetrag (nach Zuzahlung); Rechnungsbetrag
            // an die Kasse = Gesamtbrutto − Zuzahlung − Beihilfebetrag.
            const beihilfebetrag = (gesamtbruttobetrag - zuzahlungsbetrag) * beihilfefaktor;
            result.gesamtbruttobetrag += gesamtbruttobetrag;
            result.rechnungsbetrag += gesamtbruttobetrag - zuzahlungsbetrag - beihilfebetrag;
            result.zuzahlungsbetrag += zuzahlungsbetrag;
            result.beihilfebetrag += beihilfebetrag;
            result.mehrwertsteuerbetrag += mehrwertsteuer;
            return result;
        }, makeAmounts());
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