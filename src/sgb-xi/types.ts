import { CareProviderLocationSchluessel } from "../kostentraeger/types"
import { 
    Institution, 
    Versicherter
} from "../types"
import { 
    AbrechnungscodeSchluessel,
    LeistungsartSchluessel,
    MehrwertsteuerSchluessel,
    WegegebuehrenSchluessel,
    PflegehilfsmittelSchluessel,
    PflegesatzSchluessel,
    QualifikationsabhaengigeVerguetungSchluessel,
    TarifbereichSchluessel,
    UmsatzsteuerBefreiungSchluessel,
    VerguetungsartSchluessel,
    ZeitartSchluessel,
    ZeiteinheitSchluessel,
    ZuschlagsartSchluessel,
    ZuschlagsberechnungSchluessel,
    ZuschlagSchluessel,
    ZuschlagszuordnungSchluessel,
    EntlastungsleistungSchluessel,
    BeratungsbesuchSchluessel,
    SonstigeLeistungSchluessel,
    PflegegradSchluessel
} from "./codes"

export const messageIdentifiers = {
    "PLGA": "Pflegeleistungserbringer Gesamtaufstellung der Abrechnung",
    "PLAA": "Pflegeleistungserbringer Abrechnungsdaten je Abrechnungsfall",
}
export const messageIdentifierVersions = {
    "PLGA": "PLGA:6",
    "PLAA": "PLAA:6",
}
export type MessageIdentifiers = keyof typeof messageIdentifiers

export type Invoice = {
    leistungserbringer: Leistungserbringer
    rechnungsnummer: string | null
    /** Date the bill was created. If not specified, the date is "now" */
    rechnungsdatum: Date | null
    faelle: Abrechnungsfall[]
}

export type Leistungserbringer = Institution & {
    postalAddress: {
        street1: string
        postalCode: string
        city: string
    }
    abrechnungscode: AbrechnungscodeSchluessel
    location: CareProviderLocationSchluessel
    tarifbereich: TarifbereichSchluessel

    /** Steuernummer (according to §14 Abs. 1a) OR Umsatzsteuer-Identifikationsnummer.
     *  Mandatory if not VAT excempt. */
    umsatzsteuerOrdnungsnummer: string | null
    /** specified if income tax excempt */
    umsatzsteuerBefreiung: UmsatzsteuerBefreiungSchluessel | null
}

export type Abrechnungsfall = {
    versicherter: Versicherter
    kostentraegerIK: string | null
    /** 3 characters identifying a specific Vergütungsvereinbarung with the Kostenträger;
     * defaults to "000" if empty. */
    tarifkennzeichen: string
    belegnummer: string | null
    pflegegrad: PflegegradSchluessel | null
    /** Beihilfeberechtigt nach § 28 Abs. 2 SGB XI (Mitglied der sozialen
     *  Pflegeversicherung mit Beihilfeanspruch): die Pflegekasse übernimmt die
     *  zustehenden Leistungen nur zur Hälfte. Ist dies gesetzt, wird der
     *  Beihilfebetrag (= andere Hälfte) ausgewiesen und der Rechnungsbetrag
     *  entsprechend gemindert. Default: false. */
    beihilfeberechtigt?: boolean
    einsaetze: Einsatz[]
}

export type Einsatz = {
    /** Date and time at which the health care service started. 
     *  Mandatory for billing with Vergütungsart 01, 02, 03 and 06. */
    leistungsBeginn: Date
    leistungen: Leistung[]
}

/** A Leistung is subdivided into the following different subtypes, each told apart by the 
 *  "verguetungsart" field. Each Leistung requires a different set of fields to be specified.
 */
export type Leistung = 
    LeistungskomplexverguetungLeistung |
    ZeitverguetungLeistung |
    TeilstationaerLeistung |
    VollstationaerOderKurzzeitpflegeLeistung |
    PflegehilfsmittelLeistung |
    WegegebuehrenLeistung |
    EntlastungsLeistung |
    BeratungsbesuchLeistung |
    SonstigeLeistung

type BaseLeistung = {
    leistungsart: LeistungsartSchluessel
    verguetungsart: VerguetungsartSchluessel
    qualifikationsabhaengigeVerguetung: QualifikationsabhaengigeVerguetungSchluessel

    /** Price of one service provided */
    einzelpreis: number
    /** Number of things done, f.e. 3x check blood pressure, 3x 15 minutes etc. */
    anzahl: number
    punktwert: number | null
    punktzahl: number | null

    /** only mandatory for verguetungsart 04 */
    leistungsBeginn: Date| null
    /** mandatory for verguetungsart 02, 03, 04; optional for verguetungsart 01 */
    leistungsEnde: Date| null

    /** ID(s) (from national registry) for nurse(s) who provided the service.
     * Mandatory for ambulanter Pflegedienst or Betreuungsdienst or Einzelpflegekraft 
     * nach § 77 SGB XI. If the nurse doesn't have an ID, use a key from Schlüsselverzeichnis 2.17.
     * */
    beschaeftigtennummer1: number | null
    beschaeftigtennummer2: number | null

    zuschlaege: Zuschlag[]
}

export type LeistungskomplexverguetungLeistung = BaseLeistung & {
    verguetungsart: "01"
    /** 3-character current number of Leistungskomplex */
    leistungskomplex: string
}

export type ZeitverguetungLeistung = BaseLeistung & {
    verguetungsart: "02"
    zeiteinheit: ZeiteinheitSchluessel
    zeitart: ZeitartSchluessel
}

export type TeilstationaerLeistung = BaseLeistung & {
    verguetungsart: "03"
    pflegesatz: PflegesatzSchluessel
}

export type VollstationaerOderKurzzeitpflegeLeistung = BaseLeistung & {
    verguetungsart: "04"
    pflegesatz: PflegesatzSchluessel
}

export type PflegehilfsmittelLeistung = BaseLeistung & {
    verguetungsart: "05"
    hilfsmittel: Pflegehilfsmittel
    /** Hilfsmittelpositionsnummer, see /hilfsmittelverzeichnis/types.ts  */
    positionsnummer: string
}

export type WegegebuehrenLeistung = BaseLeistung & {
    verguetungsart: "06"
    wegegebuehren: WegegebuehrenSchluessel
    /** mandatory if wegegebuehren == "04"; omitted for all other values of wegegebuehren */
    gefahreneKilometer: number | null
}

export type EntlastungsLeistung = BaseLeistung & {
    verguetungsart: "07"
    entlastungsleistung: EntlastungsleistungSchluessel
}

export type BeratungsbesuchLeistung = BaseLeistung & {
    verguetungsart: "08"
    beratungsbesuch: BeratungsbesuchSchluessel
}

export type SonstigeLeistung = BaseLeistung & {
    verguetungsart: "99"
    sonstigeLeistung: SonstigeLeistungSchluessel
}

export type Zuschlag = {
    zuschlagsart: ZuschlagsartSchluessel
    zuschlag: ZuschlagSchluessel
    /** Mandatory if zuschlagsart == "00" */
    beschreibungZuschlagsart: string | null
    zuschlagszuordnung: ZuschlagszuordnungSchluessel
    zuschlagsberechnung: ZuschlagsberechnungSchluessel
    istAbzugStattZuschlag: boolean
    /** value for the surcharge. The meaning of this value depends on the 
     *  ZuschlagsberechnungSchluessel given: It could be the Punktzahl (score), a Betrag (amount, in
     *  Euro) or a Prozentsatz (percentage). 
     * 
     *  For example, if it is 42,12%, the value specified here will be 42.12. This was not clear
     *  from the docs, but we asked GKV-Spitzenverband and they clarified that:
     * 
     *  > Der Prozentsatz wird als Zahl ohne Prozent-Zeichen angegeben, z. B. „10“ für 10 %.
     *  */
    wert: number
}

export type Pflegehilfsmittel = {
    /** Only to be specified if there is any Mehrwertsteuer on it */
    mehrwertsteuerart: MehrwertsteuerSchluessel | null
    /** according to § 40 SGB XI */
    gesetzlicheZuzahlungBetrag: number | null
    /** Bei der Kostenzusage vergebene Genehmigungsnummer. Required only for "technische Hilfsmittel" */
    genehmigungskennzeichen: string | null
    genehmigungsDatum: Date | null
    /** Required only for "technische Hilfsmittel" (see § 40 Abs. 3 SGB XI) */
    kennzeichenPflegehilfsmittel: PflegehilfsmittelSchluessel | null
    /** Only to be specified if for the adjuvant used, there is no Pflegehilfsmittelpositionsnummer yet */
    bezeichnungPflegehilfsmittel: string | null
    /** Positionsnummer für Produktbesonderheiten von Pflegehilfsmitteln 
     *  
     *  This 1-10 digit number must be specified if it is specified that way in the respective 
     *  service and supply contracts.
     * 
     *  We asked the GKV-Spitzenverband about whether any numbers are known and documented. They
     *  replied that there is no directory of such service and supply contracts for 
     *  Produktbesonderheiten made by the different GKV. And thus, they assume that this field is to
     *  be filled in by each Leistungserbringer individually depending on their invididual contract(s)
     * 
     *  > Die Angabe von „besonderen Positionsnummern für Produktbesonderheiten“ ist in diesen 
     *  > [vom GKV Spitzenverband geschlossenen] Verträgen nicht vorgesehen. Die Regelungen in den 
     *  > Pflegehilfsmittelverträgen, die die Pflegekassen z.B. zur Versorgung mit Pflegebetten 
     *  > geschlossen haben, sind uns nicht bekannt. Ein Verzeichnis der vertraglich vereinbarten 
     *  > Produktbesonderheiten bei Pflegehilfsmitteln liegt uns nicht vor. Wir gehen davon aus, 
     *  > dass die Angabe der Hilfsmittelpositionsnummern für Produktbesonderheiten durch den 
     *  > Leistungserbringer vertragsabhängig als manuelle Eingabe erfolgen muss.
    */
    produktbesonderheitenPflegehilfsmittel: string | null
    /** Inventory number of the adjuvant used (if applicable) */
    inventarnummerPflegehilfsmittel: string | null
}
