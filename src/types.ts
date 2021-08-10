/** based on document: Pflege, Technische Anlage 1 für Abrechnung auf maschinell verwertbaren Datenträgern
  * see docs/documents.md for more info
  */

import { 
    RechnungsartSchluessel
} from "./codes";
import { LaenderkennzeichenSchluessel } from "./country_codes";
import { 
    AbrechnungscodeSchluessel,
    PflegegradSchluessel, 
    TarifbereichSchluessel, 
    LeistungsartSchluessel, 
    UmsatzsteuerBefreiungSchluessel,
    QualifikationsabhaengigeVerguetungSchluessel,
    VerguetungsartSchluessel,
    ZuschlagsartSchluessel,
    ZuschlagsberechnungSchluessel,
    ZuschlagSchluessel,
    ZuschlagszuordnungSchluessel,
    MehrwertsteuerSchluessel,
    PflegehilfsmittelKennzeichenSchluessel,
} from "./sgb-xi/codes";



export const messageIdentifiers = {
    "PLGA": "Pflegeleistungserbringer Gesamtaufstellung der Abrechnung",
    "PLAA": "Pflegeleistungserbringer Abrechnungsdaten je Abrechnungsfall",
    "SLGA": "Sonstige Leistungserbringer Gesamtaufstellung der Abrechnung",
    "SLLA": "Sonstige Leistungserbringer Abrechnungsdaten je Abrechnungsfall",
}
export const messageIdentifierVersions = {
    "PLGA": "PLGA:2",
    "PLAA": "PLAA:3",
    "SLGA": "SLGA:16:0:0",
    "SLLA": "SLLA:16:0:0"
}
export type MessageIdentifiers = keyof typeof messageIdentifiers;

export const testIndicator = {
    "0": "Testdatei",
    "1": "Erprobungsdatei",
    "2": "Echtdatei",
}
export type TestIndicator = keyof typeof testIndicator;

export type BillingData = {
    datenaustauschreferenzJeEmpfaengerIK: Record<string, number>;
    testIndicator: TestIndicator;
    rechnungsart: RechnungsartSchluessel;
    rechnungsnummerprefix: string;
    rechnungsdatum?: Date;
    abrechnungsmonat: Date;
    /** An ascending number indicating a correction of an earlier version of this same bill.
     *  0 or undefined if this is not a correction. */
    korrekturlieferung?: number;
    abrechnungsstelle?: Institution;
    laufendeDatenannahmeImJahrJeEmpfaengerIK: Record<string, number>;
}

export type BillingFile = {
    dateiname: string;
    absenderIK: string;
    empfaengerIK: string;
    datenaustauschreferenz: number;
    anwendungsreferenz: string;
    dateiindikator: string;
    nutzdaten: string;
    rechnungsbetrag: number;
}

export type Invoice = {
    leistungserbringer: Leistungserbringer;
    faelle: Abrechnungsfall[];
};

export type Institution = {
    name: string;
    ik: string;
    ansprechpartner: Ansprechpartner[];
    email?: string;
};

export type Ansprechpartner = {
    name: string;
    phone?: string;
}

export type Leistungserbringer = Institution & {
    abrechnungscode: AbrechnungscodeSchluessel;
    tarifbereich: TarifbereichSchluessel;
    sondertarifJeKostentraegerIK: Record<string, string>;
    /** to be specified if care provider is income tax excempt */
    umsatzsteuer?: Umsatzsteuer
};

export type Umsatzsteuer = {
    /** Steuernummer (according to §14 Abs. 1a) OR Umsatzsteuer-Identifikationsnummer.
     *  Mandatory if umsatzsteuerbefreit.
     * 
     *  ASK: documentation is vague on when it is mandatory or not. Also, in SGB XI it is called
     *  "Ordnungsnummer", in SGB V it is called Steuernummer / Umsatzsteuer-Identifikationsnummer.
     *  Is this the same thing?
     */
    identifikationsnummer?: string
    /** specified if income tax excempt */
    befreiung?: UmsatzsteuerBefreiungSchluessel
}

export type Abrechnungsfall = {
    versicherter: Versicherter;
    einsaetze: Einsatz[];
}

export type Versicherter = {
    pflegekasseIK: string
    // TODO: this field cannot be correct here, because different Kostenträger are possible even for the same Pflegekasse (for different Leistungen)
    kostentraegerIK: string
    /** Mandatory if known. If not known, full address must be specified.
     *  On prescription or health insurance card listed in field "Versicherten-Nr." */
    versichertennummer?: string
    /** Mandatory if known when billing with SGB V. If not known, full address must be specified.
     *  On prescription, listed in field "Status" */
    versichertenstatus?: string
    /** Mandatory for being able to bill with SGB XI */
    pflegegrad?: PflegegradSchluessel
    /** first names longer than 30 characters (SGB V) or 45 characters (SGB XI) will be cut off. */
    firstName: string
    /** last names longer than 47 characters (SGB V) or 45 characters (SGB XI) will be cut off. */
    lastName: string
    birthday: Date
    /** Mandatory if the versichertennummer or versichertenstatus is not known */
    address?: Address
};

export type Address = {
    /** street + housenumber longer than 30 characters (SGB V) will be cut off.
     *  For SGB XI, streets longer than 46 characters will be cut off. */
    street: string
    /** housenumbers longer than 9 characters will be cut off (SGB XI) */
    houseNumber: string
    /** Postal codes longer than 7 characters (SGB V) or 10 characters (SGB XI) will be cut off. */
    postalCode: string
    /** City names longer than 25 characters (SGB V) or 40 characters (SGB XI) will be cut off. */
    city: string
    /** to be specified if the country is not Germany. Ignored for SGB XI */
    countryCode?: LaenderkennzeichenSchluessel
}

export type Einsatz = {
    leistungsBeginn?: Date;
    leistungen: Leistung[];
};

export type Leistung = {
    leistungsart: LeistungsartSchluessel
    verguetungsart: VerguetungsartSchluessel
    qualifikationsabhaengigeVerguetung: QualifikationsabhaengigeVerguetungSchluessel

    /** The service provided TODO type! */
    leistung: string
    /** Price of one service provided */
    einzelpreis: number
    /** Number of things done, f.e. 3x check blood pressure, 3x 15 minutes etc. */
    anzahl: number

    leistungsBeginn?: Date // for verguetungsart 04
    leistungsEnde?: Date // for verguetungsart 01, 02, 03, 04
    gefahreneKilometer?: number // for verguetungsart 06 with leistung 04

    punktwert?: number
    punktzahl?: number

    zuschlaege: Zuschlag[]
    hilfsmittel?: Pflegehilfsmittel
}

export type Zuschlag = {
    zuschlagsart: ZuschlagsartSchluessel
    zuschlag: ZuschlagSchluessel
    beschreibungZuschlagsart?: string
    zuschlagszuordnung: ZuschlagszuordnungSchluessel
    zuschlagsberechnung: ZuschlagsberechnungSchluessel
    istAbzugStattZuschlag: boolean
    /** value depends on the field zuschlagsberechnung */
    wert: number
}

export type Pflegehilfsmittel = {
    /** Only to be specified if there is any Mehrwertsteuer on it */
    mehrwertsteuerart?: MehrwertsteuerSchluessel
    /** according to § 40 SGB XI */
    gesetzlicheZuzahlungBetrag?: number
    /** Bei der Kostenzusage vergebene Genehmigungsnummer. Required only for "technische Hilfsmittel" */
    genehmigungskennzeichen?: string
    genehmigungsDatum?: Date
    /** Required only for "technische Hilfsmittel" (see § 40 Abs. 3 SGB XI) */
    kennzeichenPflegehilfsmittel?: PflegehilfsmittelKennzeichenSchluessel
    /** Only to be specified if for the adjuvant used, there is no Pflegehilfsmittelpositionsnummer yet */
    bezeichnungPflegehilfsmittel?: string
    /** siehe Schlüssel Positionsnummer für Produktbesonderheiten von Pflegehilfsmitteln Anlage 3, Abschnitt 2.12 */
    produktbesonderheitenPflegehilfsmittel?: string
    /** Inventory number of the adjuvant used (if applicable) */
    inventarnummerPflegehilfsmittel?: string
}

export type Amounts = {
    /** = sum of all(rechnungsbetrag + zuzahlungsbetrag + beihilfebetrag + mwst) */
    gesamtbruttobetrag: number
    /** max. bis zum Höchstleistungsanspruch */
    rechnungsbetrag: number // 
    /** = sum of all(zuzahlungen + eigenanteil)
     * 
     * bei Pflegehilfsmitteln oder wenn Bruttobetrag über Höchstleistungsanspruch liegt */
    zuzahlungsbetrag: number
    /** gem. §28 Abs. 2 SGB XI */
    beihilfebetrag: number
    mehrwertsteuerbetrag: number
}
