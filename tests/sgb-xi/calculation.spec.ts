import { calculateFall, calculateInvoice } from "../../src/sgb-xi/calculation";
import { Abrechnungsfall, Invoice, Leistung } from "../../src/sgb-xi/types";

/** Minimale Leistung: calculateFall liest nur verguetungsart, einzelpreis und anzahl. */
const leistung = (einzelpreis: number, anzahl: number) => ({
    verguetungsart: "01",
    einzelpreis,
    anzahl
}) as unknown as Leistung;

/** Pflegehilfsmittel mit gesetzlicher Zuzahlung und ohne Mehrwertsteuer. */
const hilfsmittelLeistung = (einzelpreis: number, gesetzlicheZuzahlungBetrag: number) => ({
    verguetungsart: "05",
    einzelpreis,
    anzahl: 1,
    hilfsmittel: {
        mehrwertsteuerart: "",
        gesetzlicheZuzahlungBetrag
    }
}) as unknown as Leistung;

const fall = (beihilfeberechtigt: boolean, einsaetze: Leistung[][]) => ({
    beihilfeberechtigt,
    einsaetze: einsaetze.map(leistungen => ({ leistungen }))
}) as unknown as Abrechnungsfall;

/** Echter Fall: 3 Einsätze mit je 12,98 € × 4, 12,98 € × 8 und 6,31 € = 486,21 €. */
const fall486 = (beihilfeberechtigt: boolean) => fall(beihilfeberechtigt, [
    [leistung(12.98, 4), leistung(12.98, 8), leistung(6.31, 1)],
    [leistung(12.98, 4), leistung(12.98, 8), leistung(6.31, 1)],
    [leistung(12.98, 4), leistung(12.98, 8), leistung(6.31, 1)]
]);

/** 79,09 € × 3 = 237,27 €. */
const fall237 = (beihilfeberechtigt: boolean) => fall(beihilfeberechtigt, [
    [leistung(79.09, 3)]
]);

const cent = (value: number) => Math.round(value * 100);

describe("calculateFall mit Beihilfe", () => {

    it("teilt einen ungeraden Cent-Betrag zugunsten der Pflegekasse", () => {
        const amounts = calculateFall(fall486(true));

        expect(cent(amounts.gesamtbruttobetrag)).toEqual(48621);
        expect(amounts.rechnungsbetrag).toBeCloseTo(243.11, 2);
        expect(amounts.beihilfebetrag).toBeCloseTo(243.10, 2);
        expect(cent(amounts.rechnungsbetrag) + cent(amounts.beihilfebetrag))
            .toEqual(cent(amounts.gesamtbruttobetrag));
    });

    it("rundet die Hälfte kaufmännisch auf, auch wenn sie auf einen halben Cent fällt", () => {
        const amounts = calculateFall(fall237(true));

        expect(cent(amounts.gesamtbruttobetrag)).toEqual(23727);
        expect(amounts.rechnungsbetrag).toBeCloseTo(118.64, 2);
        expect(amounts.beihilfebetrag).toBeCloseTo(118.63, 2);
        expect(cent(amounts.rechnungsbetrag) + cent(amounts.beihilfebetrag))
            .toEqual(cent(amounts.gesamtbruttobetrag));
    });

    it("teilt einen geraden Cent-Betrag exakt", () => {
        const amounts = calculateFall(fall(true, [[leistung(25, 4)]]));

        expect(cent(amounts.gesamtbruttobetrag)).toEqual(10000);
        expect(amounts.rechnungsbetrag).toBeCloseTo(50, 2);
        expect(amounts.beihilfebetrag).toBeCloseTo(50, 2);
    });

    it("zieht die gesetzliche Zuzahlung vor der Teilung ab", () => {
        const amounts = calculateFall(fall(true, [[hilfsmittelLeistung(100.01, 10)]]));

        expect(cent(amounts.gesamtbruttobetrag)).toEqual(10001);
        expect(cent(amounts.zuzahlungsbetrag)).toEqual(1000);
        expect(amounts.rechnungsbetrag).toBeCloseTo(45.01, 2);
        expect(amounts.beihilfebetrag).toBeCloseTo(45.00, 2);
        expect(cent(amounts.rechnungsbetrag) + cent(amounts.beihilfebetrag) + cent(amounts.zuzahlungsbetrag))
            .toEqual(cent(amounts.gesamtbruttobetrag));
    });

    it("weist ohne Beihilfeberechtigung keinen Beihilfebetrag aus", () => {
        const amounts = calculateFall(fall486(false));

        expect(cent(amounts.gesamtbruttobetrag)).toEqual(48621);
        expect(amounts.beihilfebetrag).toEqual(0);
        expect(amounts.rechnungsbetrag).toBeCloseTo(amounts.gesamtbruttobetrag, 2);
    });

});

describe("calculateInvoice mit Beihilfe", () => {

    it("summiert die je Fall gerundeten Beträge", () => {
        const invoice = {
            faelle: [fall486(true), fall237(true)]
        } as unknown as Invoice;
        const amounts = calculateInvoice(invoice);

        expect(cent(amounts.gesamtbruttobetrag)).toEqual(72348);
        expect(amounts.rechnungsbetrag).toBeCloseTo(361.75, 2);
        expect(amounts.beihilfebetrag).toBeCloseTo(361.73, 2);
        expect(cent(amounts.rechnungsbetrag) + cent(amounts.beihilfebetrag))
            .toEqual(cent(amounts.gesamtbruttobetrag));
    });

});
