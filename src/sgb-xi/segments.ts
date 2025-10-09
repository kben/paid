/** based on document: Pflege, Technische Anlage 1 für Abrechnung auf maschinell verwertbaren Datenträgern
  * see docs/documents.md for more info
  */

import {
    BillingData,
    Amounts, 
    Versicherter,
    Institution,
    TestIndicator,
    Ansprechpartner
} from "../types";
import {
    MessageIdentifiers, 
    messageIdentifierVersions, 
    Leistungserbringer, 
    Invoice,
    Abrechnungsfall,
    Leistung, 
    Pflegehilfsmittel,
    Zuschlag,
} from "./types"
import {
    PflegegradSchluessel,
    TarifbereichSchluessel, 
    VerarbeitungskennzeichenSchluessel,
} from "./codes";
import { mask, number, price, day, month, date, time, datetime, segment, duration } from "../formatter";

const Syntax_Version = "UNOC:3";
const DefaultCurrency = "EUR";

export const UNB = (
    absenderIK: string, 
    empfaengerIK: string, 
    datenaustauschreferenz: number,
    anwendungsreferenz: string, 
    testIndicator: TestIndicator
) => segment(
    "UNB", 
    Syntax_Version,
    absenderIK,
    empfaengerIK,
    datetime(new Date()),
    datenaustauschreferenz.toString().substring(0, 5),
    anwendungsreferenz,
    testIndicator
);

export const UNZ = (
    numberOfMessages: number,
    datenaustauschreferenz: number,
) => segment(
    "UNZ",
    numberOfMessages.toString(),
    datenaustauschreferenz.toString().substring(0, 5),
);

export const UNH = (
    messageReferenceNumber: number, // = index of message (starting with UNH)
    messageIdentifier: MessageIdentifiers,
) => segment(
    "UNH",
    messageReferenceNumber.toString().substring(0, 5),
    messageIdentifierVersions[messageIdentifier]
);

export const UNT = (
    numberOfSegments: number, // Control count including UNH and UNT
    messageReferenceNumber: number // = index of message
) => segment(
    "UNT",
    numberOfSegments.toString(),
    messageReferenceNumber.toString().substring(0, 5),
);

export const FKT = (
    verarbeitungskennzeichen: VerarbeitungskennzeichenSchluessel, // always "01"
    {
        absender, // PLGA: Absender der Datei, identisch zu Absender in UNB; PLAA: wie RechnungsstellerIK (?)
        rechnungssteller, // Leistungserbringer oder Abrechnungsstelle mit Inkassovollmacht bei Sammelrechnung; PLAA == PLGA
    }: {
        absender: Institution,
        rechnungssteller: Institution,
    },
    {
        kostentraegerIK, // Institution die die Rechnung begleicht laut Kostenträgerdatei; PLAA == PLGA
        versicherter: { krankenkasseIK }, // Pflegekasse des Leistungs- bzw. Bewilligungsbescheids; falls angegeben gilt: PLAA == PLGA
    }: Abrechnungsfall,
    isSammelrechnungPLGA?: boolean, // only for PLGA, undefined for PLAA
) => segment(
    "FKT",
    verarbeitungskennzeichen,
    isSammelrechnungPLGA != undefined
        ? (isSammelrechnungPLGA
            ? "J"
            : "")
        : undefined,
    rechnungssteller.ik,
    kostentraegerIK || "",
    isSammelrechnungPLGA !== true ? krankenkasseIK : "",
    isSammelrechnungPLGA !== undefined ? absender.ik : rechnungssteller.ik
);

export const REC = (
    {
        rechnungsart
    }: BillingData,
    {
        rechnungsnummer,
        rechnungsdatum,
    }: Invoice,
    leistungserbringerIndex: number,
    isSammelrechnungPLGA: boolean,
    currency = DefaultCurrency
) => segment(
    "REC",
    mask(rechnungsnummer!) + ":" +
        (isSammelrechnungPLGA || rechnungsart == "1" ? 0 : (leistungserbringerIndex + 1)),
    date(rechnungsdatum || new Date()),
    rechnungsart,
    currency
);

export const SRD = (
    {
        abrechnungscode,
        tarifbereich,
    }: Leistungserbringer,
    {
        einsaetze,
        tarifkennzeichen,
    }: Abrechnungsfall,
    isAbrechnungsstelleAndSammelrechnungPLGA: boolean,
) => segment(
    "SRD",
    (isAbrechnungsstelleAndSammelrechnungPLGA
        ? "00"
        : abrechnungscode)
    + ":" + tarifbereich + (tarifkennzeichen.substring(0, 3) || "000"),
    einsaetze[0].leistungen[0].leistungsart
);

export const UST = ({
    umsatzsteuerOrdnungsnummer: identifikationsnummer,
    umsatzsteuerBefreiung: befreiung,
}: Leistungserbringer) => segment(
    "UST",
    mask(identifikationsnummer || ""),
    befreiung?.length ? "J" : "",
    befreiung || ""
);

export const GES = ({
    gesamtbruttobetrag,
    rechnungsbetrag,
    zuzahlungsbetrag,
    beihilfebetrag,
    mehrwertsteuerbetrag,
}: Amounts) => segment(
    "GES",
    price(gesamtbruttobetrag),
    price(zuzahlungsbetrag || undefined),
    price(beihilfebetrag || undefined),
    price(rechnungsbetrag),
    price(mehrwertsteuerbetrag || undefined)
);

export const NAM = ({
    name,
    ansprechpartner
}: Institution) => segment(
    "NAM",
    mask(name.substring(0, 30)),
    ...getAnsprechpartner(ansprechpartner)
);

const getAnsprechpartner = (ansprechpartner: Ansprechpartner[]) => {
    const maxItems = 4;
    const maxCharacters = 30;
    let availableSlots = maxItems - ansprechpartner.length;
    const result: string[] = [];

    // ensure that phone numbers are not cut off
    ansprechpartner.slice(0, maxItems - 1).forEach(({ name, phone }) => {
        if (name && !phone) {
            result.push(name.substring(0, maxCharacters));
        } else if (name && phone) {
            const line = `${name} ${phone}`;

            if (line.length <= maxCharacters) {
                result.push(line);
            } else if (phone.length <= maxCharacters) {
                if (availableSlots > 0) {
                    result.push(name.substring(0, maxCharacters), phone);
                    availableSlots--;
                } else {
                    result.push(`${name.substring(0, maxCharacters - phone.length - 2)}. ${phone}`);
                }
            } else {
                result.push(name.substring(0, maxCharacters));
            }
        }
    });

    return result;
}

export const INV = (
    versichertennummer: string | undefined = "",
    belegnummer: string
) => segment(
    "INV",
    mask(versichertennummer.substring(0, 12)),
    belegnummer.substring(0, 10)
);

export const NAD = ({
    firstName,
    lastName,
    birthday,
    address
}: Versicherter) => segment(
    "NAD",
    mask(firstName.substring(0, 45)),
    mask(lastName.substring(0, 45)),
    date(birthday),
    mask(address?.street?.substring(0, 46) || ""),
    mask(address?.houseNumber?.substring(0, 9) || ""),
    mask(address?.postalCode?.substring(0, 10) || ""),
    mask(address?.city?.substring(0, 40) || "")
);

export const MAN = (
    monatLeistungserbringung: Date,
    pflegegrad: PflegegradSchluessel,
) => segment(
    "MAN",
    monatLeistungserbringung.getFullYear() + month(monatLeistungserbringung),
    "", // "Pflegestufe", obsolete
    "", // "Pflegeklasse", obsolete
    pflegegrad
);

export const ESK = (
    leistungsBeginn?: Date,
) => segment(
    "ESK",
    leistungsBeginn ? day(leistungsBeginn) : "99",
    leistungsBeginn ? time(leistungsBeginn) : ""
);

export const ELS = (leistung: Leistung) => segment(
    "ELS",
    [
        leistung.leistungsart,
        leistung.verguetungsart,
        leistung.qualifikationsabhaengigeVerguetung,
        getLeistungSchluessel(leistung)
    ].join(":"),
    price(leistung.einzelpreis),
    number(leistung.punktwert, 5),
    number(leistung.punktzahl, 0),
    getLeistungDetails(leistung),
    number(leistung.anzahl, 2),
    number(leistung.beschaeftigtennummer1),
    number(leistung.beschaeftigtennummer2),
)

/** see codes.ts - 2.7 Schlüssel Leistung */
const getLeistungSchluessel = (leistung: Leistung): string | undefined => {
    switch(leistung.verguetungsart) {
        case "01": 
            return mask(leistung.leistungskomplex.padStart(3, "0")) // 3-character string
        case "02":
            return leistung.zeiteinheit + leistung.zeitart
        case "03":
        case "04":
            return leistung.pflegesatz
        case "05":
            return mask(leistung.positionsnummer) // 10-character string
        case "06":
            return leistung.wegegebuehren
        case "07":
            return leistung.entlastungsleistung
        case "08":
            return leistung.beratungsbesuch
        case "99":
            return leistung.sonstigeLeistung
    }
}

/** documentation reads:
 * 
 *  Einzutragen ist bei Vergütungsart s. Schlüsselverzeichnis Anlage 3, Abschnitt 2.5. 
 * 
 *  01 => 00 bzw. Uhrzeit der Beendigung der Leistungserbringung (Uhrzeit), in der Form: hhmm
 *  02 => die Uhrzeit der Beendigung der Leistungserbringung (Uhrzeit), in der Form: hhmm
 *  03 => der Bis-Zeitraum (Uhrzeit). In der Form: hhmm
 *  04 => der Vom/Bis-Zeitraum (Von/Tag und Bis/Tag). In der Form: TTTT
 *  05 => 00
 *  06 => Wegegebühren-/Beförderungsentgeltart = 04 nach Schlüssel 2.7.5, die Anzahl der gefahrenen Kilometer, (es sind nur ganze Kilometer zu melden und kaufmännisch zu runden z. B. 3,40 Km, zu melden 3), sonst = 00 (bei SC 01-03),
 *  07 => frei
 *  08 => 00
 *  99 => 00
 */
const getLeistungDetails = (leistung: Leistung): string | undefined => {
    switch(leistung.verguetungsart) {
        case "02":
            return number(duration(leistung.leistungsBeginn!, leistung.leistungsEnde!, "minutes"), 0).slice(0, 4)
        case "03":
            return time(leistung.leistungsEnde!)
        case "04":
            return day(leistung.leistungsBeginn!) + day(leistung.leistungsEnde!)
        case "06":
            if (leistung.wegegebuehren == "04" && leistung.gefahreneKilometer) {
                return Math.round(leistung.gefahreneKilometer).toString() // integer from 0-9999
            } else {
                return "00"
            }
        default:
            return "00"
    }
}

export const ZUS = (
    isLast: boolean,
    tarifbereich: TarifbereichSchluessel,
    {
        zuschlagsart, 
        zuschlag, 
        zuschlagszuordnung,
        zuschlagsberechnung,
        istAbzugStattZuschlag,
        wert, // absolute value e.g. 123,4 = 123,40000, percent value e.g. 12 % = 12,00000
        beschreibungZuschlagsart,
    }: Zuschlag,
    ergebnis: number,
) => segment(
    "ZUS",
    [tarifbereich, zuschlagsart, zuschlag].join(":"),
    mask(beschreibungZuschlagsart?.substring(0, 50) || ""),
    zuschlagszuordnung,
    zuschlagsberechnung,
    istAbzugStattZuschlag ? "0" : "1",
    number(wert, 5),
    price(ergebnis),
    isLast? "1" : "0"
);

export const HIL = ({
    mehrwertsteuerart = "",
    gesetzlicheZuzahlungBetrag,
    genehmigungskennzeichen = "",
    genehmigungsDatum,
    kennzeichenPflegehilfsmittel = "",
    bezeichnungPflegehilfsmittel = "",
    produktbesonderheitenPflegehilfsmittel = "",
    inventarnummerPflegehilfsmittel = "",
}: Pflegehilfsmittel,
    mehrwertsteuerbetrag?: number
) => segment(
    "HIL",
    mehrwertsteuerart || "",
    price(mehrwertsteuerbetrag),
    price(gesetzlicheZuzahlungBetrag),
    mask(genehmigungskennzeichen?.substring(0, 15)),
    genehmigungsDatum ? date(genehmigungsDatum) : "",
    kennzeichenPflegehilfsmittel || "",
    mask(bezeichnungPflegehilfsmittel?.substring(0, 30)),
    mask(produktbesonderheitenPflegehilfsmittel?.substring(0, 10)),
    mask(inventarnummerPflegehilfsmittel?.substring(0, 20)),
);

export const IAF = ({ // is calculcated from all ELS / ZUS / HIL segments for one INV segment
    gesamtbruttobetrag,
    rechnungsbetrag,
    zuzahlungsbetrag,
    beihilfebetrag
}: Amounts) => segment(
    "IAF",
    price(gesamtbruttobetrag),
    price(zuzahlungsbetrag || undefined),
    price(beihilfebetrag || undefined),
    price(rechnungsbetrag),
);
