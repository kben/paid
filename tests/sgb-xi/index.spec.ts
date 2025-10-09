import MockDate from "mockdate";
import { absender, transmissionIdentifiers } from "../../src/transmission/utils";
import { makeNutzdaten } from "../../src/sgb-xi";
import { makeAnwendungsreferenz, makeDateiname } from "../../src/sgb-xi/filenames";
import { payload1, payload2, payload3, institutionLists } from "../samples/billingPayloads";
import { result1, result2, result3 } from "../samples/billingResults";
import { InstitutionListsIndex } from "../../src/kostentraeger";

describe("payload", () => {

    it("create billing with invoice type 1", () => {
        MockDate.set("2021-04-27T21:59");
        const { invoices, billingData } = payload1;
        const { transferNumber, datenaustauschreferenz, laufendeDatenannahmeImJahr } = transmissionIdentifiers(billingData, "");
        const sender = absender(billingData, invoices[0]);
        const dateiname = makeDateiname(billingData.testIndicator, transferNumber);
        const month = invoices[0].faelle[0].einsaetze[0].leistungsBeginn;
        const anwendungsreferenz = makeAnwendungsreferenz(billingData, month, sender.ik, "AO", laufendeDatenannahmeImJahr);
        const {nutzdaten} = makeNutzdaten(billingData, invoices, new InstitutionListsIndex(institutionLists), sender.ik, "000000011", datenaustauschreferenz, anwendungsreferenz);
        
        expect(dateiname).toEqual(result1.dateiname);
        expect(anwendungsreferenz).toEqual(result1.anwendungsreferenz);
        expect(nutzdaten.split("\n")).toEqual(result1.nutzdaten.split("\n"));
        MockDate.reset();
    });

    it("create billing with invoice type 2", () => {
        MockDate.set("2021-04-27T21:59");
        const { invoices, billingData } = payload2;
        const { transferNumber, datenaustauschreferenz, laufendeDatenannahmeImJahr } = transmissionIdentifiers(billingData, "");
        const sender = absender(billingData, invoices[0]);
        const dateiname = makeDateiname(billingData.testIndicator, transferNumber);
        const month = invoices[0].faelle[0].einsaetze[0].leistungsBeginn;
        const anwendungsreferenz = makeAnwendungsreferenz(billingData, month, sender.ik, "AO", laufendeDatenannahmeImJahr);
        const {nutzdaten} = makeNutzdaten(billingData, invoices, new InstitutionListsIndex(institutionLists), sender.ik, "000000011", datenaustauschreferenz, anwendungsreferenz);

        expect(dateiname).toEqual(result2.dateiname);
        expect(anwendungsreferenz).toEqual(result2.anwendungsreferenz);
        expect(nutzdaten.split("\n")).toEqual(result2.nutzdaten.split("\n"));
        MockDate.reset();
    });

    it("create billing with invoice type 3", () => {
        MockDate.set("2021-04-27T21:59");
        const { invoices, billingData } = payload3;
        const { transferNumber, datenaustauschreferenz, laufendeDatenannahmeImJahr } = transmissionIdentifiers(billingData, "");
        const sender = absender(billingData, invoices[0]);
        const dateiname = makeDateiname(billingData.testIndicator, transferNumber);
        const month = invoices[0].faelle[0].einsaetze[0].leistungsBeginn;
        const anwendungsreferenz = makeAnwendungsreferenz(billingData, month, sender.ik, "AO", laufendeDatenannahmeImJahr);
        const {nutzdaten} = makeNutzdaten(billingData, invoices, new InstitutionListsIndex(institutionLists), sender.ik, "000000011", datenaustauschreferenz, anwendungsreferenz);

        expect(dateiname).toEqual(result3.dateiname);
        expect(anwendungsreferenz).toEqual(result3.anwendungsreferenz);
        expect(nutzdaten.split("\n")).toEqual(result3.nutzdaten.split("\n"));
        MockDate.reset();
    });

});
