import { ELS } from "../../src/sgb-xi/segments";
import { Leistung } from "../../src/sgb-xi/types";

const leistung = (beschaeftigtennummer1: number | null, beschaeftigtennummer2: number | null = null): Leistung => ({
    leistungsart: "01",
    verguetungsart: "01",
    qualifikationsabhaengigeVerguetung: "3",
    leistungskomplex: "021",
    einzelpreis: 12.98,
    punktwert: null,
    punktzahl: null,
    leistungsBeginn: null,
    leistungsEnde: null,
    anzahl: 4,
    beschaeftigtennummer1,
    beschaeftigtennummer2,
    zuschlaege: [],
} as unknown as Leistung);

describe("ELS segment", () => {
    it("pads the Beschäftigtennummer to 9 digits (leading zeros)", () => {
        expect(ELS(leistung(8902285))).toContain("+4,00+008902285");
    });

    it("keeps 9-digit Beschäftigtennummern unchanged", () => {
        expect(ELS(leistung(258265071, 61914398))).toContain("+4,00+258265071+061914398");
    });

    it("leaves a missing Beschäftigtennummer empty", () => {
        expect(ELS(leistung(null)).trimEnd()).toMatch(/\+4,00'$/);
    });
});
