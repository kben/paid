import { groupInvoicesByRecipientSGBXI, validateForTransmissionSGBXI } from "../../src/transmission";
import { payload2 } from "../samples/billingPayloads";
import { institutionLists } from "../samples/institutions";
import { Invoice } from "../../src/sgb-xi/types";
import { InstitutionListsIndex } from "../../src/kostentraeger";

describe("transmission", () => {

    it("trying to group invoices without finding a recipient", async () => {
        const { invoicesWithRecipient, recipientNotFound } = groupInvoicesByRecipientSGBXI(payload2.invoices, new InstitutionListsIndex([]));
        expect(invoicesWithRecipient).toHaveLength(0);
        expect(recipientNotFound).toHaveLength(2);
    });

    it("validate SGB XI invoices and billing data for transmission", async () => {
        const { invoicesWithRecipient, recipientNotFound } = groupInvoicesByRecipientSGBXI(
            replaceWithRealKrankenkasseIK(payload2.invoices),
            new InstitutionListsIndex(institutionLists)
        );
        expect(invoicesWithRecipient).toHaveLength(2);
        expect(recipientNotFound).toHaveLength(0);

        const { errors, warnings } = await validateForTransmissionSGBXI(payload2.billingData, invoicesWithRecipient[0]);
        expect(errors).toEqual([{
            code: "throwsError",
            type: 1,
            path: ["billingData", "senderCertificate"],
            message: "Error: Object's schema was not verified against input data for Certificate",
        }]);
        expect(warnings).toEqual([{
            code: "textTruncated",
            type: 0,
            path: [
                "invoicesWithRecipient",
                "invoices",
                0,
                "leistungserbringer",
                "name"
            ],
            message: undefined,
            params: {
                maxLength: "30",
                truncatedValue: "Nachbarschaftspflege in Wilhel"
            }
        }]);
    });

});

const replaceWithRealKrankenkasseIK = (invoices: Invoice[]) => {
    const krankenkasseIKs = ["185830016", "182114819", "182114819"];
    const updatedInvoices = invoices.slice();
    let index = 0;
    updatedInvoices.forEach(invoice =>
        invoice.faelle.forEach(fall =>
            fall.versicherter.krankenkasseIK = krankenkasseIKs[index++ % krankenkasseIKs.length]
        )
    );
    return updatedInvoices;
}
