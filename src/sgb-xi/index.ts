/** based on document: Pflege, Technische Anlage 1 für Abrechnung auf maschinell verwertbaren Datenträgern
  * see docs/documents.md for more info
  */

import {
    Invoice,
    Abrechnungsfall, 
    Einsatz,
    Leistung
} from "./types";
import { incrementalNumber, valuesGroupedBy } from "../utils";
import { LeistungsartSchluessel, RechnungsartSchluessel } from "./codes";
import { UNB, UNZ } from "./segments";
import { makePLAA, makePLGA } from "./message";
import { BillingData, GroupInvoiceByRecipientMethod, Pflegegrad, Recipient } from "../types";
import { InstitutionListsIndex } from "../kostentraeger";

/** 
 * # Structure
 * 
 * Depends on Rechnungsart (1,2,3) and Sammelrechnung (yes or no)
 * 
 * ### Rechnungsart 1
 * Used for health care service providers that do accounting themselves, have one Institutionskennzeichen
 * 
 * ```txt
 * for each Kostenträger:
 *   PLGA Sammelrechnung (mandatory if more than one Pflegekasse)
 *   for each Pflegekasse:
 *     PLGA Gesamtrechnung
 *     PLAA
 * ```
 * 
 * ### Rechnungsart 2
 * Used for 
 * - health care service providers that do accounting themselves but have multiple Institutionskennzeichen
 * - accounting centers without collecting power (Abrechnungsstelle ohne Inkassovollmacht)
 * 
 * Same structure as for Rechnungsart 1, only that the invoices for each Leistungserbringer are
 * listed one after another.
 * 
 * ```txt
 * for each Leistungserbringer:
 *   for each Kostenträger:
 *     PLGA Sammelrechnung (mandatory if more than one Pflegekasse)
 *     for each Pflegekasse:
 *       PLGA Gesamtrechnung
 *       PLAA
 * ```
 * 
 * ### Rechnungsart 3
 * Used for accounting centers with collecting power (Abrechnungsstelle mit Inkassovollmacht), i.e.
 * manages accounting for multiple health care service providers (Leistungserbringer).
 * 
 * Note that the structure is different from Rechnungsart 1 and 2. Leistungserbringer are grouped by
 * Kostenträgers, not the other way round!
 * 
 * ```txt
 * for each Kostenträger:
 *   PLGA Sammelrechnung (always mandatory)
 *   for each Leistungserbringer:
 *     for each Pflegekasse:
 *       PLGA Gesamtrechnung
 *       PLAA
 * ```
 */
export const makeNutzdaten = (
    billingData: BillingData,
    invoices: Invoice[],
    institutionListsIndex: InstitutionListsIndex,
    senderIK: string,
    recipientIK: string,
    datenaustauschreferenz: number,
    anwendungsreferenz: string,
) => {
    const { rechnungsart, rechnungsnummerprefix, belegnummerprefix, testIndicator } = billingData;
    const assignNumbers = true;
    let messageNumber = 0;
    let belegnummer = billingData.nextBelegnummer;
    let rechnungsnummer = billingData.nextRechnungsnummer;

    // according to section 4.2 Struktur der Datei, grouped invoices for all three Rechnungsarten
    const groupedInvoices: Invoice[][] = mapEachKostentraeger(invoices, rechnungsart, institutionListsIndex)
        .flatMap(invoices => [
            ...mapEachLeistungserbringerAndPflegekasse(invoices).map((invoicesByPflegekasse) => [
                ...invoicesByPflegekasse.map((invoice, leistungserbringerIndex) => ({
                    ...invoice,
                    // ensure that every Abrechnungsfall is per one month and one Pflegegrad
                    faelle: splitByPflegegrad(groupByMonth(
                        invoice.faelle.map(fall => {
                            // sort leistungen und einsätze by start date
                            fall.einsaetze.forEach(einsatz =>
                                einsatz.leistungen.sort(sortByLeistungsBeginn)
                            );
                            fall.einsaetze.sort(sortByLeistungsBeginn);
                            return fall
                        })
                    )).map(fall => ({
                        ...fall,
                        // assign an auto-incremental belegnummer if needed
                        belegnummer: fall.belegnummer || (assignNumbers
                            ? incrementalNumber(belegnummer++, 10, belegnummerprefix)
                            : null),
                    })),
                    // assign an auto-incremental invoice number if needed
                    rechnungsnummer: invoice.rechnungsnummer || (assignNumbers
                        ? incrementalNumber(
                            leistungserbringerIndex == 0
                                ? rechnungsnummer++
                                : (rechnungsnummer - 1),
                            14, 
                            rechnungsnummerprefix
                        )
                        : null),
                    rechnungsdatum: invoice.rechnungsdatum || new Date(),
                }))
            ])
        ]);
    const flattenedInvoices = groupedInvoices.flatMap(item => item);

    const nutzdaten = [
        UNB(senderIK, recipientIK, datenaustauschreferenz, anwendungsreferenz, testIndicator),
        ...groupedInvoices.flatMap((invoicesByPflegekasse, index) => [
            ...rechnungsart != "1" || invoicesByPflegekasse.length > 1
                ? makePLGA(++messageNumber, mergeInvoices(invoicesByPflegekasse), billingData, index, true)
                : [],
            ...invoicesByPflegekasse.flatMap((invoice, leistungserbringerIndex) => [
                ...makePLGA(++messageNumber, invoice, billingData, leistungserbringerIndex, false),
                ...makePLAA(++messageNumber, invoice, billingData, leistungserbringerIndex)
            ])
        ]),
        UNZ(messageNumber, datenaustauschreferenz)
    ].join("");

    // console.log(indentNutzdaten(nutzdaten));

    return {
        nutzdaten,
        invoices: flattenedInvoices,
        nextRechnungsnummer: rechnungsnummer,
        nextBelegnummer: belegnummer,
    };
};

const sortByLeistungsBeginn = (a: Einsatz | Leistung, b: Einsatz | Leistung) =>
    (a?.leistungsBeginn?.getTime() || Number.MAX_VALUE)
    - (b?.leistungsBeginn?.getTime() || Number.MAX_VALUE);

const mapEachKostentraeger = (
    invoices: Invoice[], 
    rechnungsart: RechnungsartSchluessel,
    institutionListsIndex: InstitutionListsIndex,
): Invoice[][] => 
    structureForRechnungsart(
        invoices.flatMap(invoice => {
            const faelle = groupByLeistungsart(invoice.faelle)
                .flatMap(fall => {
                    const { krankenkasse, kostentraeger } = institutionListsIndex.findForData(
                        fall.versicherter.krankenkasseIK, 
                        { sgbxiLeistungsart: fall.einsaetze[0].leistungen[0].leistungsart },
                        invoice.leistungserbringer.location,
                    ) || {};

                    if (!krankenkasse || !kostentraeger) {
                        return [];
                    }

                    fall.versicherter.krankenkasseIK = krankenkasse.ik;
                    return [{ ...fall, kostentraegerIK: kostentraeger.ik }]
                });
            
            return valuesGroupedBy(faelle, fall => fall.kostentraegerIK)
                .map(faelle => ({
                    ...invoice,
                    faelle
                }));
        }),
        rechnungsart
    );

/** 
 * split an array of Abrechnungsfälle based on the property leistungsart 
 * that is stored deep down the nested structure on each leistung
 * because each Abrechnungsfall has to be for one kind of leistungsart only
*/
const groupByLeistungsart = (faelle: Abrechnungsfall[]): Abrechnungsfall[] =>
    faelle.flatMap(fall =>
        existingLeistungsarten(fall.einsaetze) // find all unique leistungsarten in einseatze
        .map(leistungsart => ({
            ...fall,
            einsaetze: fall.einsaetze.map(einsatz => ({
                ...einsatz,
                leistungen: einsatz.leistungen.filter(leistung => 
                    leistung.leistungsart == leistungsart // keep every leistung that has the current leistungsart 
                )
            })).filter(einsatz => einsatz.leistungen.length) // remove every einsatz with empty leistungen
        }))
    );

const existingLeistungsarten = (einsaetze: Einsatz[]): LeistungsartSchluessel[] =>
    [...new Set(
        einsaetze.flatMap(einsatz => einsatz.leistungen).map(leistung => leistung.leistungsart)
    )];

const structureForRechnungsart = (
    invoices: Invoice[], 
    rechnungsart: RechnungsartSchluessel,
): Invoice[][] =>
    rechnungsart != "3"
        ? [invoices]
        : groupInvoicesByKostentraeger(invoices);

const groupInvoicesByKostentraeger = (invoices: Invoice[]): Invoice[][] =>
    valuesGroupedBy(invoices, invoice => invoice.faelle[0].kostentraegerIK || "");

const mapEachLeistungserbringerAndPflegekasse = (invoices: Invoice[]): Invoice[][] => 
    invoices.map(invoice =>
        valuesGroupedBy(invoice.faelle, fall => fall.versicherter.krankenkasseIK)
            .map(faelle => ({ ...invoice, faelle } as Invoice))
    );

const mergeInvoices = (invoices: Invoice[]): Invoice => ({
    ...invoices[0],
    leistungserbringer: {...invoices[0].leistungserbringer},
    faelle: invoices.flatMap(invoice => invoice.faelle)
})

// - group Abrechnungsfaelle

const groupByMonth = (faelle: Abrechnungsfall[]) => faelle.flatMap(fall => [
    ...valuesGroupedBy(fall.einsaetze, einsatz =>
        getLeistungsBeginn(einsatz)?.getMonth().toString() || ""
    ).flatMap(einsaetze => ({
        ...fall,
        einsaetze
    } as Abrechnungsfall))
]);

export const splitByPflegegrad = (faelle: Abrechnungsfall[]): Abrechnungsfall[] => faelle.flatMap(fall => {
    const dates = fall.einsaetze
        .map(einsatz => getLeistungsBeginn(einsatz)?.getTime())
        .filter(date => date != undefined);
    const start = Math.min(...dates as number[]);
    const end = Math.max(...dates as number[]);
    const pflegegrade = getMatchingPflegegrade(fall.versicherter.pflegegrad, start, end);

    if (pflegegrade.length == 0) {
        return [];
    } else if (pflegegrade.length == 1) {
        const pflegegrad = pflegegrade[0].value;

        if (pflegegrad) {
            return [{ ...fall, pflegegrad }];
        } else {
            return [];
        }
    } else {
        return pflegegrade.flatMap((pflegegrad, index, list) => {
            if (pflegegrad.value) {
                const start = pflegegrad.since.getTime();
                const end = list.at(index + 1)?.since.getTime();
                return [{
                    ...fall,
                    pflegegrad: pflegegrad.value,
                    einsaetze: fall.einsaetze.filter(einsatz => {
                        const date = getLeistungsBeginn(einsatz)?.getTime();
                        return !date || (start <= date && (!end || date < end));
                    })
                }];
            } else {
                return [];
            }
        });
    }
});

export function getLeistungsBeginn({ leistungsBeginn, leistungen }: Einsatz) {
    return leistungsBeginn || leistungen.find(leistung => !!leistung.leistungsBeginn)?.leistungsBeginn;
}

export function getMatchingPflegegrade(pflegegrade: Pflegegrad[], start: number, end: number) {
    if (pflegegrade.length == 1) {
        if (pflegegrade[0].since.getTime() < end) {
            return pflegegrade;
        } else {
            return [];
        }
    } else {
        return pflegegrade
            .slice()
            .sort((a, b) => (a.since.getTime() ?? Number.NEGATIVE_INFINITY) - (b.since.getTime() ?? Number.NEGATIVE_INFINITY))
            .filter(({ since }, index, list) =>
                since.getTime() < end
                && (start <= since.getTime() || !list[index + 1] || start <= list[index + 1].since.getTime())
            )
    }
}

// - group by recipient

export const groupInvoiceByRecipient: GroupInvoiceByRecipientMethod = (invoice, findRecipient) => {
    const invoiceByRecipient: Record<string, { 
        recipient?: Recipient, 
        krankenkasseIK?: string, 
        kostentraegerIK?: string, 
        invoice: Invoice
    }> = {};
    const location = invoice.leistungserbringer.location;

    groupByLeistungsart(invoice.faelle).forEach(fall => {
        const { key, recipient } = findRecipient(
            fall.versicherter.krankenkasseIK,
            { sgbxiLeistungsart: fall.einsaetze[0]?.leistungen[0]?.leistungsart },
            location,
        );

        if (!invoiceByRecipient[key]) {
            invoiceByRecipient[key] = {
                recipient,
                invoice: {
                    ...invoice,
                    faelle: [fall]
                }
            };
        } else {
            invoiceByRecipient[key].invoice.faelle.push(fall);
        }
    });

    return invoiceByRecipient;
}

// - debug helper

const indentNutzdaten = (nutzdaten: string) => 
    nutzdaten.split("\n").slice(0, -1)
        .map((line, index, list) => `"${line}\\n"` + (index < list.length - 1 ? " +" : ""))
        .map(line => line
            .replace(/^"(UNB|UNZ|UNH|UNT)/, "  \"$1")
            .replace(/^"(FKT|REC|SRD|UST|GES|NAM|INV|IAF)/, "      \"$1")
            .replace(/^"(NAD|MAN|ESK|ELS|HIL|ZUS)/, "          \"$1"))
        .join("\n")
