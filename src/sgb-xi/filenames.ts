/** based on document: Pflege, Technische Anlage 1, Anhang 3, Datenübermittlungsarten
  * see docs/documents.md for more info
  */

import { BillingData, TestIndicator } from "../types"
import { KassenartSchluessel } from "../kostentraeger/filename/codes"
import { AnwendungsreferenzFactory } from "../transmission"

/** A.k.a. "logischer Dateiname" */
export const makeAnwendungsreferenz: AnwendungsreferenzFactory = (
    {
        rechnungsart,
        abrechnungsmonat,
        korrekturlieferung = 0
    }: BillingData,
    _,
    kassenart: KassenartSchluessel,
    laufendeDatenannahmeImJahr: number,
) => [
    // "Absenderklassifikation". "PL" stands for "Pflege-Leistungserbringer"
    "PL",
    (abrechnungsmonat.getMonth() + 1).toString().padStart(2, "0") +
    abrechnungsmonat.getFullYear().toString().substr(3, 1),
    korrekturlieferung,
    laufendeDatenannahmeImJahr.toString().slice(0, 2).padStart(2, "0"),
    // Who sends this bill: "S" stands for "Selbstabrechner", "A" stands for "Abrechnungszentrum"
    rechnungsart == "1" ? "S" : "A",
    kassenart
].join("")

/** A.k.a "Verfahrenskennung" */
export const makeDateiname = (
    dateiindikator: TestIndicator,
    transferNumber: number
) => [
    dateiindikator == "2" ? "E" : "T",
    // "PFL" stands for "Pflege-Leistungserbringer"
    "PFL",
    "0", // verfahrensversion. Always 0
    transferNumber.toString().slice(0, 3).padStart(3, "0")
].join("")
