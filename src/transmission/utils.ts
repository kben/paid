/** based on document: Pflege, Technische Anlage 1 für Abrechnung auf maschinell verwertbaren Datenträgern
  * see docs/documents.md for more info
  */

import { Invoice } from "../sgb-xi/types";
import { BillingData } from "../types";

export const absenderAndRechnungssteller = (billing: BillingData, invoice: Invoice) => ({
    absender: absender(billing, invoice),
    rechnungssteller: rechnungssteller(billing, invoice),
});

/** 
 * @returns Leistungserbringer, der selbst abrechnet (Rechnungsart 1)
 *     oder Abrechnungsstelle (Rechnungsart 2 + 3)
 */
export const absender = (
    { rechnungsart, abrechnungsstelle }: BillingData,
    { leistungserbringer }: Invoice
) => rechnungsart == "1" || !abrechnungsstelle ? leistungserbringer : abrechnungsstelle;

/**
 * @returns Leistungserbringer (Rechnungsart 1 + 2) 
 *     oder Abrechnungsstelle mit Inkasssovollmacht (Rechnungsart 3)
 */
export const rechnungssteller = (
    { rechnungsart, abrechnungsstelle }: BillingData,
    { leistungserbringer }: Invoice
) => rechnungsart != "3" || !abrechnungsstelle ? leistungserbringer : abrechnungsstelle;

export const transmissionIdentifiers = (
    { datenaustauschreferenzJeEmpfaengerIK, laufendeDatenannahmeImJahrJeEmpfaengerIK}: BillingData,
    recipientIK: string
) => {
    const datenaustauschreferenz = (datenaustauschreferenzJeEmpfaengerIK[recipientIK] || 0) + 1;
    const laufendeDatenannahmeImJahr = (laufendeDatenannahmeImJahrJeEmpfaengerIK[recipientIK] || 0) + 1;
    const transferNumber = (datenaustauschreferenz - 1) % 1000;
    return { datenaustauschreferenz, laufendeDatenannahmeImJahr, transferNumber};
};
