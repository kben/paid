import { calculateFall, calculateInvoice } from "../../src/sgb-xi/calculation";
import { Abrechnungsfall, Invoice, Leistung } from "../../src/sgb-xi/types";
import { price } from "../../src/formatter";

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

describe("calculateFall rundet je Leistung auf ganze Cent", () => {

    it("rundet eine angebrochene Leistung auf den Cent und teilt sie glatt", () => {
        // 12,98 € × 9,39 = 121,8822 € — eine an der Budgetgrenze angebrochene Leistung.
        const amounts = calculateFall(fall(true, [[leistung(12.98, 9.39)]]));

        expect(amounts.gesamtbruttobetrag).toEqual(121.88);
        expect(amounts.rechnungsbetrag).toEqual(60.94);
        expect(amounts.beihilfebetrag).toEqual(60.94);
    });

    it("teilt einen angebrochenen Betrag mit ungeradem Cent zugunsten der Pflegekasse", () => {
        // 20,45 € × 1,13 = 23,1085 € → 23,11 € → 11,56 € Kasse + 11,55 € Beihilfe.
        const amounts = calculateFall(fall(true, [[leistung(20.45, 1.13)]]));

        expect(amounts.gesamtbruttobetrag).toEqual(23.11);
        expect(amounts.rechnungsbetrag).toEqual(11.56);
        expect(amounts.beihilfebetrag).toEqual(11.55);
    });

    it("schreibt die Beträge einer angebrochenen Leistung ohne Rest in die Datei", () => {
        const amounts = calculateFall(fall(true, [[leistung(20.45, 1.13)]]));

        expect(price(amounts.rechnungsbetrag)).toEqual("11,56");
        expect(price(amounts.beihilfebetrag)).toEqual("11,55");
        expect(price(amounts.gesamtbruttobetrag)).toEqual("23,11");
    });

    it("summiert die je Leistung gerundeten Werte, nicht den gerundeten Rohbetrag", () => {
        // 12,98 € × 0,33 = 4,2834 € → 4,28 € je Leistung → 12,84 €.
        // Erst am Ende gerundet wären es 12,8502 € → 12,85 € — ein Cent mehr, als die
        // Pflegekasse beim Nachrechnen der einzelnen Positionen erhält.
        const amounts = calculateFall(fall(false, [[
            leistung(12.98, 0.33),
            leistung(12.98, 0.33),
            leistung(12.98, 0.33)
        ]]));

        expect(amounts.gesamtbruttobetrag).toEqual(12.84);
        expect(amounts.rechnungsbetrag).toEqual(12.84);
    });

    it("teilt auch eine Gutschrift mit negativem Betrag", () => {
        const amounts = calculateFall(fall(true, [[leistung(486.21, -1)]]));

        expect(amounts.gesamtbruttobetrag).toEqual(-486.21);
        expect(amounts.rechnungsbetrag).toEqual(-243.11);
        expect(amounts.beihilfebetrag).toEqual(-243.10);
        expect(cent(amounts.rechnungsbetrag) + cent(amounts.beihilfebetrag))
            .toEqual(cent(amounts.gesamtbruttobetrag));
    });

    it("weist einen Nullbetrag nie als negative Null aus", () => {
        // Die zweite Leistung ergibt für sich gerundet -0 Cent.
        const amounts = calculateFall(fall(true, [[leistung(12.5, 0), leistung(-0.004, 1)]]));

        Object.values(amounts).forEach(value => {
            expect(value).toEqual(0);
            expect(Object.is(value, -0)).toBe(false);
        });
    });

    it("schreibt Beträge ab 1000 € ohne Tausenderpunkt", () => {
        const amounts = calculateFall(fall(false, [[leistung(1234.56, 1)]]));

        expect(price(amounts.gesamtbruttobetrag)).toEqual("1234,56");
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
