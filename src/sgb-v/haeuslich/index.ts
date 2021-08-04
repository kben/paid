/** based on documents: 
 *  - Sonstige Leistungserbringer, Technische Anlage 1 für die maschinelle Abrechnung, 
 *    Kapitel 5.5.3.4 SLLA: C (Häusliche Krankenpflege)
 *  - Sonstige Leistungserbringer, Technische Anlage 1 für die maschinelle Abrechnung, 
 *    Kapitel 5.5.3.5 SLLA: D (Haushaltshilfe)
 *  - Verordnungsformular für häusliche Krankenpflege: Muster 12
 * 
  * see docs/documents.md for more info
  */

import { Segment } from "../../edifact/types"
import { sum } from "../../utils"
import { INV, NAD, TXT, DIA, SKZ, FKT, REC } from "../segments_slla"
import { einsatzSegment, BES, ELP, einzelfallnachweisSegment, verordnungSegment } from "./segments"
import { 
    HaeuslicheKrankenpflegeAbrechnungsposition,
    HaeuslicheKrankenpflegePauschaleAbrechnungsposition,
    HaeuslicheKrankenpflegeRechnung
} from "./types"

/* TODO validations: 
 * 
 *  ERRORS:
 *  ------- 
 *  Rechnung:
 *    leistungserbringerIK.length != 9
 *    kostentraegerIK.length != 9
 *    pflegekasseIK.length != 9
 *    sammelRechnungsnummer.length > 14
 *    einzelrechnungsnummer?.length > 6
 * 
 *    Abrechnungsfall:
 *      belegnummer.length > 10
 *      besondereVersorgungsform.length > 25
 *      einsaetze.length < 1
 *      verordnungen.length < 1
 * 
 *      Versicherter:
 *        !(versichertennummer && versichertenstatus) && !(address.street && address.houseNumber && address.postalCode && address.city)
 *        versichertennummer.length > 12
 * 
 *      Einsatz:
 *        startDateTime.getTime() < endDateTime.getTime()
 *        abrechnungspositionen.length < 1
 * 
 *        Abrechnungsposition:
 *          einzelpreis <= 0 || einzelpreis >= 10 000 000 000
 *          anzahl <= 0 || anzahl >= 10000
 *          gefahreneKilometer < 0 || gefahreneKilometer >= 1 000 000
 *          leistungserbringergruppe.sondertarif.length != 3
 * 
 *        HaeuslicheKrankenpflegeEinzelposition:
 *          anzahl <= 0 || anzahl >= 10000
 * 
 *      Verordnung:
 *        kostenzusagen.length < 1
 *        betriebsstaettennummer.length > 9
 *        vertragsarztnummer.length > 9
 *      
 *        Diagnose:
 *          diagnoseschluessel.length > 12
 * 
 *        Kostenzusage:
 *          genehmigungsKennzeichen.length > 20
 * 
 *  WARNINGS:
 *  ---------
 *  Rechnung:
 *    Abrechnungsfall:
 *      Versicherter:
 *        lastName.length > 47
 *        firstName.length > 30
 *        (houseNumber.length == 0 ? street.length : street.length + 1 + houseNumber.length).length > 30
 *        city.length > 25
 * 
 *      Abrechnungsposition:
 *        text.length > 70
 * 
 *        Verordnung:
 *          Diagnose:
 *            diagnosetext.length > 70
*/

/**
 * Structure:
 * ----------
 * The structure is (currently) the same for häusl. Krankenpflege and Haushaltshilfe, only the 
 * segment names differ.
 * 
 * One message per combination of health insurance (Pflegekasse), 
 * health care service provider (Leistungserbringer) and payer (Kostenträger)
 * 
 * FKT
 * REC
 * for each Abrechnungsfall:
 *   INV
 *   URI (cond.)
 *   NAD
 *   IMG (cond.)
 *   for each Einsatz, in chronological order:
 *     ESK / ESH
 *     for each Abrechnungsposition:
 *       EHK / EHH
 *       TXT (cond.)
 *       if Abrechnungsposition is Pauschale, for each Einzelleistung:
 *         ELP
 *   for each Verordnung:
 *     ZHK / ZHH
 *     for each Diagnose, if any:
 *       DIA
 *     for each Kostenzusage:
 *       SKZ
 *   BES
 */
export const makeMessage = (rechnung: HaeuslicheKrankenpflegeRechnung): Segment[] => {
    // contract: all insurees must have same pflegekasseIK
    // contract: all Abrechnungsposition in all Einsatz in all Abrechnungsfall must be of type
    //           HaeuslicheKrankenpflegeAbrechnungsposition

    // all Einsaetze must be sorted chronologically
    rechnung.abrechnungsfaelle.forEach(abrechnungsfall => {
        abrechnungsfall.einsaetze.sort((a, b) => 
        a.leistungsBeginn.getTime() - b.leistungsBeginn.getTime()
    )})

    const le = rechnung.leistungserbringerSammelgruppe

    return [
        FKT("01", rechnung),
        REC(rechnung),
        ...rechnung.abrechnungsfaelle.flatMap(fall => [
            INV(fall),
            NAD(fall.versicherter),
            ...fall.einsaetze.flatMap(einsatz => [
                einsatzSegment(le, einsatz.leistungsBeginn, einsatz.leistungsEnde),
                ...einsatz.abrechnungspositionen.flatMap(position => [
                    einzelfallnachweisSegment(le, position as HaeuslicheKrankenpflegeAbrechnungsposition),
                    // add TXT segment only if there is any text
                    position.text ? TXT(position.text) : undefined,
                    // add ELP segments only if there are any einzelpositionen (= position is a Pauschale)
                    ...("einzelpositionen" in position ? 
                        (position as HaeuslicheKrankenpflegePauschaleAbrechnungsposition).einzelpositionen.map(e => ELP(e)) : 
                        [undefined]
                    )
                ])
            ]),
            ...fall.verordnungen.flatMap(verordnung => [
                verordnungSegment(le, verordnung),
                ...verordnung.diagnosen.map(d => DIA(d)),
                ...verordnung.kostenzusagen.map(k => SKZ(k))
            ]),
            BES(
                // sum all prices of all Abrechnungspositions of all Einsätze
                sum(fall.einsaetze.flatMap(einsatz => 
                    einsatz.abrechnungspositionen.map(position => 
                        Math.round(position.einzelpreis * position.anzahl)
                    )
                ))
            )
        ])
    // some segments are left out conditionally (by returning undefined), so we need to filter those out
    ].filter(segment => segment !== undefined) as Segment[]
}
