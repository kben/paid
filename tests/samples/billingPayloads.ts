import {
    Institution,
    Versicherter,
    BillingData,
} from "../../src/types"
import {
    Invoice,
    Leistungserbringer,
    LeistungskomplexverguetungLeistung,
    BeratungsbesuchLeistung,
    WegegebuehrenLeistung,
    PflegehilfsmittelLeistung,
    TeilstationaerLeistung,
    VollstationaerOderKurzzeitpflegeLeistung,
    ZeitverguetungLeistung,
    EntlastungsLeistung,
    SonstigeLeistung, 
} from "../../src/sgb-xi/types"
import { InstitutionList } from "../../src/kostentraeger/types";
import { exampleKostentraegerCertificatePEM } from "./certificates";
import { base64ToArrayBuffer } from "../../src/pki/utils";
import { AsnParser } from "@peculiar/asn1-schema"
import { Certificate, Time } from "@peculiar/asn1-x509"

const leistungserbringer: Leistungserbringer[] = [{
    name: "Pflegedienst Musterstadt GmbH",
    ik: "000000110",
    postalAddress: {
        street1: "ABC-Straße 1",
        postalCode: "12345",
        city: "Musterstadt",
    },
    ansprechpartner: [{
        name: "Sven Bauer",
        phone: "012 34567-8",
    }],
    abrechnungscode: "36",
    tarifbereich: "00",
    location: "HE",
    umsatzsteuerBefreiung: "01",
    umsatzsteuerOrdnungsnummer: null,
    email: "test@example.com",
}, {
    name: "Nachbarschaftspflege in Wilhelmsburg gGmbH",
    ik: "000000120",
    postalAddress: {
        street1: "ABC-Straße 2a",
        postalCode: "20095",
        city: "Hamburg",
    },
    ansprechpartner: [{
        name: "Laila Neumann",
        phone: "012 34567",
    }],
    abrechnungscode: "35",
    tarifbereich: "05",
    location: "HH",
    umsatzsteuerBefreiung: "01",
    umsatzsteuerOrdnungsnummer: null,
    email: "test@example.com",
}, {
    name: "Quartierspflege Neuhausen GmbH",
    ik: "000000130",
    postalAddress: {
        street1: "ABC-Straße 3",
        postalCode: "12345",
        city: "Otterfing",
    },
    ansprechpartner: [{
        name: "Ben Peters",
        phone: "012 3456789",
    }],
    abrechnungscode: "36",
    tarifbereich: "02",
    location: "BY",
    umsatzsteuerBefreiung: null,
    umsatzsteuerOrdnungsnummer: "123/456/78900",
    email: "test@example.com",
}, {
    name: "Von Mensch zu Mensch gGmbH",
    ik: "000000140",
    postalAddress: {
        street1: "ABC-Straße 4",
        postalCode: "12345",
        city: "Heilbronn",
    },
    ansprechpartner: [{
        name: "Lena Wolf",
        phone: "0123 456789",
    }],
    abrechnungscode: "35",
    tarifbereich: "01",
    location: "BW",
    umsatzsteuerBefreiung: "01",
    umsatzsteuerOrdnungsnummer: null,
    email: "test@example.com",
}, {
    name: "Pflegedienst Neukölln GmbH",
    ik: "000000150",
    postalAddress: {
        street1: "ABC-Straße 5",
        postalCode: "12345",
        city: "Berlin",
    },
    ansprechpartner: [{
        name: "Yvonne Zimmermann",
        phone: "0123 456789",
    }],
    abrechnungscode: "36",
    tarifbereich: "23",
    location: "BE",
    umsatzsteuerBefreiung: null,
    umsatzsteuerOrdnungsnummer: "012/345/67890",
    email: "test@example.com",
}];

const abrechnungsstellen: Institution[] = [{
    name: "Payday GmbH",
    ik: "000000210",
    ansprechpartner: [{
        name: "Peter Schmidt",
        phone: "0123 45678-90",
    }],
    email: "test@example.com",
}, {
    name: "PAID Abrechnungszentrum eG",
    ik: "000000310",
    ansprechpartner: [{
        name: "Sonja Weiß-Müller",
        phone: "01234 5678-92",
    }, {
        name: "Josef Klein",
        phone: null
    }],
    email: "test@example.com",
}]

const versicherte: Versicherter[] = [{
    krankenkasseIK: "180000010",
    versichertennummer: "0123456789",
    versichertenstatus: "51",
    pflegegrad: [{ value: "3", since: new Date(0) }],
    firstName: "Gertrud",
    lastName: "Fischer",
    birthday: new Date("1938-03-01"),
    address: {
        street: "Musterstraße",
        houseNumber: "1",
        postalCode: "12345",
        city: "Musterstadt",
        countryCode: null
    }
}, {
    krankenkasseIK: "180000010",
    versichertennummer: "0123456789",
    versichertenstatus: "51",
    pflegegrad: [
        { value: "2", since: new Date("2020-06-01T00:00") },
        { value: "3", since: new Date("2021-04-07T00:00") },
    ],
    firstName: "Jürgen",
    lastName: "Weber",
    birthday: new Date("1941-09-02"),
    address: {
        street: "Musterstraße",
        houseNumber: "2",
        postalCode: "12345",
        city: "Musterstadt",
        countryCode: null
    }
}, {
    krankenkasseIK: "180000020",
    versichertennummer: "0123456789",
    versichertenstatus: "51",
    pflegegrad: [{ value: "4", since: new Date(0) }],
    firstName: "Paul",
    lastName: "Hofmann",
    birthday: new Date("1932-11-03"),
    address: {
        street: "Musterstraße",
        houseNumber: "3",
        postalCode: "12345",
        city: "Musterstadt",
        countryCode: null
    }
}, {
    krankenkasseIK: "180000030",
    versichertennummer: "0123456789",
    versichertenstatus: "51",
    pflegegrad: [{ value: "4", since: new Date(0) }],
    firstName: "Sabine",
    lastName: "Schwarz",
    birthday: new Date("1942-10-04"),
    address: {
        street: "Musterstraße",
        houseNumber: "4",
        postalCode: "12345",
        city: "Musterstadt",
        countryCode: null
    }
}, {
    krankenkasseIK: "180000040",
    versichertennummer: "0123456789",
    versichertenstatus: "51",
    pflegegrad: [{ value: "1", since: new Date(0) }],
    firstName: "Ingeborg",
    lastName: "Wagner",
    birthday: new Date("1936-02-05"),
    address: {
        street: "Musterstraße",
        houseNumber: "5",
        postalCode: "12345",
        city: "Musterstadt",
        countryCode: null
    }
}, {
    krankenkasseIK: "180000030",
    versichertennummer: "0123456789",
    versichertenstatus: "51",
    pflegegrad: [{ value: "2", since: new Date(0) }],
    firstName: "Robert",
    lastName: "Schäfer",
    birthday: new Date("1937-06-06"),
    address: {
        street: "Musterstraße",
        houseNumber: "6",
        postalCode: "12345",
        city: "Musterstadt",
        countryCode: null
    }
}, {
    krankenkasseIK: "180000050",
    versichertennummer: "0123456789",
    versichertenstatus: "51",
    pflegegrad: [{ value: "2", since: new Date(0) }],
    firstName: "Małgorzata",
    lastName: "Dąbrowski",
    birthday: new Date("1946-08-07"),
    address: null
}]

export const institutionLists: InstitutionList[] = [{
    issuerIK: "",
    leistungserbringerGruppeSchluessel: "6",
    kassenart: "AO",
    validityStartDate: new Date("2021-01-01T00:00:00"),
    institutions: [{
        ik: "180000010",
        name: "",
        abbreviatedName: "",
        addresses: [],
        datenannahmestelleLinks: [{
            ik: "000000011",
            location: null,
            transmissionTypes: [],
            sgbxiLeistungsart: null,
            sgbvAbrechnungscode: null
        }],
        vertragskassennummer: null,
        validityFrom: null,
        validityTo: null,
        contacts: null,
        transmissionEmail: null,
        certificates: null,
        kim: null,
        kostentraegerLinks: null,
        untrustedDatenannahmestelleLinks: null,
        papierannahmestelleLinks: null
    }, {
        ik: "180000020",
        name: "",
        abbreviatedName: "",
        addresses: [],
        kostentraegerLinks: [{
            ik: "000000021",
            location: null,
            transmissionTypes: [],
            sgbxiLeistungsart: null,
            sgbvAbrechnungscode: null
        }],
        vertragskassennummer: null,
        validityFrom: null,
        validityTo: null,
        contacts: null,
        transmissionEmail: null,
        certificates: null,
        kim: null,
        datenannahmestelleLinks: null,
        untrustedDatenannahmestelleLinks: null,
        papierannahmestelleLinks: null
    }, {
        ik: "000000021",
        name: "",
        abbreviatedName: "",
        addresses: [],
        datenannahmestelleLinks: [{
            ik: "000000011",
            location: null,
            transmissionTypes: [],
            sgbxiLeistungsart: null,
            sgbvAbrechnungscode: null
        }],
        vertragskassennummer: null,
        validityFrom: null,
        validityTo: null,
        contacts: null,
        transmissionEmail: null,
        certificates: null,
        kim: null,
        kostentraegerLinks: null,
        untrustedDatenannahmestelleLinks: null,
        papierannahmestelleLinks: null
    }, {
        ik: "180000030",
        name: "",
        abbreviatedName: "",
        addresses: [],
        kostentraegerLinks: [{
            ik: "000000031",
            location: null,
            transmissionTypes: [],
            sgbxiLeistungsart: null,
            sgbvAbrechnungscode: null
        }],
        vertragskassennummer: null,
        validityFrom: null,
        validityTo: null,
        contacts: null,
        transmissionEmail: null,
        certificates: null,
        kim: null,
        datenannahmestelleLinks: null,
        untrustedDatenannahmestelleLinks: null,
        papierannahmestelleLinks: null
    }, {
        ik: "000000031",
        name: "",
        abbreviatedName: "",
        addresses: [],
        datenannahmestelleLinks: [{
            ik: "000000011",
            location: null,
            transmissionTypes: [],
            sgbxiLeistungsart: null,
            sgbvAbrechnungscode: null
        }],
        vertragskassennummer: null,
        validityFrom: null,
        validityTo: null,
        contacts: null,
        transmissionEmail: null,
        certificates: null,
        kim: null,
        kostentraegerLinks: null,
        untrustedDatenannahmestelleLinks: null,
        papierannahmestelleLinks: null
    }, {
        ik: "180000040",
        name: "",
        abbreviatedName: "",
        addresses: [],
        kostentraegerLinks: [{
            ik: "000000031",
            location: null,
            transmissionTypes: [],
            sgbxiLeistungsart: null,
            sgbvAbrechnungscode: null
        }],
        vertragskassennummer: null,
        validityFrom: null,
        validityTo: null,
        contacts: null,
        transmissionEmail: null,
        certificates: null,
        kim: null,
        datenannahmestelleLinks: null,
        untrustedDatenannahmestelleLinks: null,
        papierannahmestelleLinks: null
    }, {
        ik: "180000050",
        name: "",
        abbreviatedName: "",
        addresses: [],
        datenannahmestelleLinks: [{
            ik: "000000011",
            location: null,
            transmissionTypes: [],
            sgbxiLeistungsart: null,
            sgbvAbrechnungscode: null
        }],
        vertragskassennummer: null,
        validityFrom: null,
        validityTo: null,
        contacts: null,
        transmissionEmail: null,
        certificates: null,
        kim: null,
        kostentraegerLinks: null,
        untrustedDatenannahmestelleLinks: null,
        papierannahmestelleLinks: null
    }, {
        ik: "000000011",
        name: "",
        abbreviatedName: "",
        addresses: [],
        transmissionEmail: "test@example.com",
        certificates: [(() => {
            const certificate = AsnParser.parse(
                base64ToArrayBuffer(exampleKostentraegerCertificatePEM()),
                Certificate
            );
            certificate.tbsCertificate.validity.notBefore = new Time("2021-01-01T00:00:00");
            return certificate;
        })()],
        vertragskassennummer: null,
        validityFrom: null,
        validityTo: null,
        contacts: null,
        kim: null,
        kostentraegerLinks: null,
        datenannahmestelleLinks: null,
        untrustedDatenannahmestelleLinks: null,
        papierannahmestelleLinks: null
    }],
    caCertificates: [],
}];

// Leistungen

const leistungskomplex: LeistungskomplexverguetungLeistung = {
    leistungsart: "01",
    verguetungsart: "01",
    qualifikationsabhaengigeVerguetung: "1",
    leistungskomplex: "001",
    einzelpreis: 28.37,
    anzahl: 1,
    leistungsBeginn: new Date("2021-04-02T11:00"),
    leistungsEnde: new Date("2021-04-02T11:30"),
    punktwert: 0.06114,
    punktzahl: 464,
    zuschlaege: [],
    beschaeftigtennummer1: null,
    beschaeftigtennummer2: null,
};
const zeitverguetung: ZeitverguetungLeistung = {
    leistungsart: "01",
    verguetungsart: "02",
    qualifikationsabhaengigeVerguetung: "1",
    zeiteinheit: "1",
    zeitart: "3",
    punktwert: null,
    punktzahl: null,
    einzelpreis: 45.45,
    anzahl: 1,
    leistungsBeginn: new Date("2021-04-02T10:00"),
    leistungsEnde: new Date("2021-04-02T11:00"),
    zuschlaege: [],
    beschaeftigtennummer1: null,
    beschaeftigtennummer2: null,
};
const zeitMitZuschlag: ZeitverguetungLeistung = {
    leistungsart: "01",
    verguetungsart: "02",
    qualifikationsabhaengigeVerguetung: "1",
    zeiteinheit: "1",
    zeitart: "3",
    punktwert: null,
    punktzahl: null,
    einzelpreis: 45.45,
    anzahl: 1,
    leistungsBeginn: new Date("2021-04-02T10:00"),
    leistungsEnde: new Date("2021-04-02T11:00"),
    zuschlaege: [{
        zuschlagsart: "1",
        zuschlag: "21",
        zuschlagszuordnung: "1",
        zuschlagsberechnung: "11",
        istAbzugStattZuschlag: false,
        wert: 10,
        beschreibungZuschlagsart: null
    }],
    beschaeftigtennummer1: null,
    beschaeftigtennummer2: null,
};
const wegegebuehrenEinsatzpauschale: WegegebuehrenLeistung = {
    leistungsart: "01",
    verguetungsart: "06",
    qualifikationsabhaengigeVerguetung: "1",
    wegegebuehren: "03",
    gefahreneKilometer: null,
    punktwert: null,
    punktzahl: null,
    einzelpreis: 2,
    anzahl: 1,
    leistungsBeginn: null,
    leistungsEnde: null,
    zuschlaege: [],
    beschaeftigtennummer1: null,
    beschaeftigtennummer2: null,
};
const wegegebuehrenKilometer: WegegebuehrenLeistung = {
    leistungsart: "01",
    verguetungsart: "06",
    qualifikationsabhaengigeVerguetung: "1",
    wegegebuehren: "04",
    punktwert: null,
    punktzahl: null,
    einzelpreis: 0.4,
    anzahl: 1,
    gefahreneKilometer: 5,
    leistungsBeginn: null,
    leistungsEnde: null,
    zuschlaege: [],
    beschaeftigtennummer1: null,
    beschaeftigtennummer2: null,
};
const pflegehilfsmittel: PflegehilfsmittelLeistung = {
    leistungsart: "06",
    verguetungsart: "05",
    qualifikationsabhaengigeVerguetung: "0",
    positionsnummer: "000000000",
    punktwert: null,
    punktzahl: null,
    einzelpreis: 123.45,
    anzahl: 1,
    leistungsBeginn: null,
    leistungsEnde: null,
    zuschlaege: [],
    hilfsmittel: {
        mehrwertsteuerart: "1",
        gesetzlicheZuzahlungBetrag: 10.12,
        genehmigungskennzeichen: "genehmigt_123",
        genehmigungsDatum: new Date("2021-03-01"),
        kennzeichenPflegehilfsmittel: "00",
        bezeichnungPflegehilfsmittel: "Rollator",
        produktbesonderheitenPflegehilfsmittel: null,
        inventarnummerPflegehilfsmittel: null
    },
    beschaeftigtennummer1: null,
    beschaeftigtennummer2: null,
};
const entlastungsleistung: EntlastungsLeistung = {
    leistungsart: "10",
    verguetungsart: "07",
    qualifikationsabhaengigeVerguetung: "1",
    punktwert: null,
    punktzahl: null,
    einzelpreis: 36.50,
    anzahl: 1,
    leistungsBeginn: null,
    leistungsEnde: null,
    entlastungsleistung: "30",
    zuschlaege: [],
    beschaeftigtennummer1: null,
    beschaeftigtennummer2: null,
};
const beratungsbesuch: BeratungsbesuchLeistung = {
    leistungsart: "09",
    verguetungsart: "08",
    qualifikationsabhaengigeVerguetung: "1",
    punktwert: null,
    punktzahl: null,
    einzelpreis: 32,
    anzahl: 1,
    leistungsBeginn: null,
    leistungsEnde: null,
    beratungsbesuch: "1",
    zuschlaege: [],
    beschaeftigtennummer1: null,
    beschaeftigtennummer2: null,
};
const teilstationaer: TeilstationaerLeistung = {
    leistungsart: "02",
    verguetungsart: "03",
    qualifikationsabhaengigeVerguetung: "1",
    pflegesatz: "01",
    punktwert: null,
    punktzahl: null,
    einzelpreis: 42.84,
    anzahl:1,
    leistungsBeginn: new Date("2021-04-02T10:00"),
    leistungsEnde: new Date("2021-04-02T18:00"),
    zuschlaege: [],
    beschaeftigtennummer1: null,
    beschaeftigtennummer2: null,
};
const kurzzeitpflege: VollstationaerOderKurzzeitpflegeLeistung = {
    leistungsart: "04",
    verguetungsart: "04",
    qualifikationsabhaengigeVerguetung: "1",
    pflegesatz: "00",
    punktwert: null,
    punktzahl: null,
    einzelpreis: 234.56,
    anzahl: 8,
    leistungsBeginn: new Date("2021-04-03T12:00"),
    leistungsEnde: new Date("2021-04-11T12:00"),
    zuschlaege: [],
    beschaeftigtennummer1: null,
    beschaeftigtennummer2: null,
};
const sonstigeleistung: SonstigeLeistung = {
    leistungsart: "02", // does not make sense: Tagespflege is not a sonstige leistung, but I didn't know which one is
    verguetungsart: "99",
    qualifikationsabhaengigeVerguetung: "1",
    punktwert: null,
    punktzahl: null,
    einzelpreis: 47.95,
    anzahl: 1,
    leistungsBeginn: null,
    leistungsEnde: null,
    sonstigeLeistung: "99",
    zuschlaege: [],
    beschaeftigtennummer1: null,
    beschaeftigtennummer2: null,
};

// Nutzdaten

export const payload1 = {
    billingData: {
        testIndicator: "0",
        rechnungsart: "1",
        verarbeitungskennzeichen: "01",
        rechnungsnummerprefix: "2021-0087-",
        senderCertificate: new ArrayBuffer(0),
        senderPrivateKey: new ArrayBuffer(0),
        datenaustauschreferenzJeEmpfaengerIK: {},
        laufendeDatenannahmeImJahrJeEmpfaengerIK: {},
        nextRechnungsnummer: 1,
        nextBelegnummer: 1,
    } as BillingData,
    invoices: [{
        leistungserbringer: {...leistungserbringer[0]},
        rechnungsdatum: new Date("2021-05-03"),
        faelle: [{
            versicherter: { ...versicherte[0] },
            tarifkennzeichen: "",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-01T10:30"),
                leistungen: [
                    { 
                        ...leistungskomplex, 
                        leistungsBeginn: new Date("2021-04-01T11:00"), 
                        leistungsEnde: new Date("2021-04-31T11:30")
                    },
                    {
                        ...leistungskomplex,
                        leistungsBeginn: new Date("2021-04-01T10:30"),
                        leistungsEnde: new Date("2021-04-01T11:00")
                    },
                    { ...wegegebuehrenKilometer },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-02T11:00"),
                leistungen: [
                    {
                        ...leistungskomplex,
                        leistungsBeginn: new Date("2021-04-02T11:00"),
                        leistungsEnde: new Date("2021-04-02T11:30")
                    },
                    { ...wegegebuehrenKilometer },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-04T11:00"),
                leistungen: [
                    {
                        ...zeitverguetung,
                        leistungsBeginn: new Date("2021-04-04T11:00"),
                        leistungsEnde: new Date("2021-04-04T11:30")
                    },
                    { ...wegegebuehrenEinsatzpauschale },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-04T18:00"),
                leistungen: [
                    {
                        ...zeitMitZuschlag,
                        leistungsBeginn: new Date("2021-04-04T18:00"),
                        leistungsEnde: new Date("2021-04-04T18:30")
                    },
                    { ...pflegehilfsmittel },
                    { ...wegegebuehrenEinsatzpauschale },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-06T13:00"),
                leistungen: [
                    {
                        ...beratungsbesuch,
                        leistungsBeginn: new Date("2021-04-06T13:00"),
                        leistungsEnde: new Date("2021-04-06T13:30")
                    },
                ]
            }]
        }, {
            versicherter: {...versicherte[2]},
            eindeutigeBelegnummer: "2021-1235",
            tarifkennzeichen: "",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-03T11:00"),
                leistungen: [
                    {
                        ...zeitverguetung,
                        leistungsBeginn: new Date("2021-04-03T11:00"),
                        leistungsEnde: new Date("2021-04-03T11:30")
                    },
                    { ...wegegebuehrenEinsatzpauschale }
                ]
            }, {
                leistungsBeginn: new Date("2021-04-07T13:00"),
                leistungen: [
                    {
                        ...beratungsbesuch,
                        leistungsBeginn: new Date("2021-04-07T13:00"),
                        leistungsEnde: new Date("2021-04-07T13:30")
                    },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-10T13:00"),
                leistungen: [
                    {
                        ...entlastungsleistung,
                        leistungsBeginn: new Date("2021-04-10T13:00"),
                        leistungsEnde: new Date("2021-04-10T13:45")
                    },
                ]
            }]
        }]
    }] as Invoice[],
};

export const payload2 = {
    billingData: {
        testIndicator: "0",
        rechnungsart: "2",
        verarbeitungskennzeichen: "01",
        rechnungsnummerprefix: "2021-0267-",
        abrechnungsmonat: new Date("2021-04-01"),
        abrechnungsstelle: abrechnungsstellen[0],
        senderCertificate: new ArrayBuffer(0),
        senderPrivateKey: new ArrayBuffer(0),
        datenaustauschreferenzJeEmpfaengerIK: {},
        laufendeDatenannahmeImJahrJeEmpfaengerIK: {},
        nextRechnungsnummer: 1,
        nextBelegnummer: 1,
    } as BillingData,
    invoices: [{
        leistungserbringer: { ...leistungserbringer[1] },
        faelle: [{
            versicherter: { ...versicherte[1] },
            tarifkennzeichen: "011",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-05T11:00"),
                leistungen: [
                    {
                        ...zeitverguetung,
                        leistungsBeginn: new Date("2021-04-05T11:00"),
                        leistungsEnde: new Date("2021-04-05T11:30")
                    },
                    { ...pflegehilfsmittel },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-08T11:00"),
                leistungen: [
                    {
                        ...zeitverguetung,
                        leistungsBeginn: new Date("2021-04-08T11:00"),
                        leistungsEnde: new Date("2021-04-08T11:30")
                    },
                ]
            }],
        }, {
            versicherter: { ...versicherte[3] },
            eindeutigeBelegnummer: "2021-2894",
            tarifkennzeichen: "",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-05T11:00"),
                leistungen: [
                    {
                        ...zeitverguetung,
                        leistungsBeginn: new Date("2021-04-05T11:00"),
                        leistungsEnde: new Date("2021-04-05T11:30")
                    },
                    { ...pflegehilfsmittel },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-08T11:00"),
                leistungen: [
                    {
                        ...zeitverguetung,
                        leistungsBeginn: new Date("2021-04-08T11:00"),
                        leistungsEnde: new Date("2021-04-08T11:30")
                    },
                ]
            }],
        }]
    }, {
        leistungserbringer: { ...leistungserbringer[2] },
        faelle: [{
            versicherter: { ...versicherte[4] },
            eindeutigeBelegnummer: "2021-354",
            tarifkennzeichen: "",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-05T11:00"),
                leistungen: [
                    {
                        ...zeitverguetung,
                        leistungsBeginn: new Date("2021-04-05T11:00"),
                        leistungsEnde: new Date("2021-04-05T11:30")
                    },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-08T11:00"),
                leistungen: [
                    {
                        ...leistungskomplex,
                        leistungsBeginn: new Date("2021-04-08T11:00"),
                        leistungsEnde: new Date("2021-04-08T11:30")
                    },
                ]
            }]
        }, {
            versicherter: { ...versicherte[5] },
            eindeutigeBelegnummer: "2021-355",
            tarifkennzeichen: "",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-05T11:00"),
                leistungen: [
                    {
                        ...zeitverguetung,
                        leistungsBeginn: new Date("2021-04-05T11:00"),
                        leistungsEnde: new Date("2021-04-05T11:30")
                    },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-08T11:00"),
                leistungen: [
                    {
                        ...beratungsbesuch,
                        leistungsBeginn: new Date("2021-04-08T11:00"),
                        leistungsEnde: new Date("2021-04-08T11:30")
                    },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-23T12:10"),
                leistungen: [
                    {
                        ...sonstigeleistung,
                        leistungsBeginn: new Date("2021-04-23T12:10"),
                        leistungsEnde: new Date("2021-04-23T12:35")
                    },
                ]
            }]
        }]
    }] as Invoice[],
};

export const payload3 = {
    billingData: {
        testIndicator: "0",
        rechnungsart: "3",
        verarbeitungskennzeichen: "01",
        rechnungsnummerprefix: "2021-0398-",
        abrechnungsmonat: new Date("2021-04-01"),
        abrechnungsstelle: abrechnungsstellen[1],
        senderCertificate: new ArrayBuffer(0),
        senderPrivateKey: new ArrayBuffer(0),
        datenaustauschreferenzJeEmpfaengerIK: {
            "123456789": 1
        },
        laufendeDatenannahmeImJahrJeEmpfaengerIK: {
            "123456789": 1
        },
        nextRechnungsnummer: 1,
        nextBelegnummer: 1,
    } as BillingData,
    invoices: [{
        leistungserbringer: { ...leistungserbringer[3] },
        faelle: [{
            versicherter: { ...versicherte[6] },
            eindeutigeBelegnummer: "2021-0413",
            tarifkennzeichen: "",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-03T11:00"),
                leistungen: [
                    {
                        ...zeitverguetung,
                        leistungsBeginn: new Date("2021-04-03T11:00"),
                        leistungsEnde: new Date("2021-04-03T11:30")
                    },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-10T11:00"),
                leistungen: [
                    {
                        ...zeitverguetung,
                        leistungsBeginn: new Date("2021-04-10T11:00"),
                        leistungsEnde: new Date("2021-04-10T11:30")
                    },
                ]
            }]
        }, {
            versicherter: { ...versicherte[0] },
            eindeutigeBelegnummer: "2021-0414",
            tarifkennzeichen: "",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-03T11:00"),
                leistungen: [
                    {
                        ...zeitverguetung,
                        leistungsBeginn: new Date("2021-04-03T11:00"),
                        leistungsEnde: new Date("2021-04-03T11:30")
                    },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-10T11:00"),
                leistungen: [
                    {
                        ...beratungsbesuch,
                        leistungsBeginn: new Date("2021-04-10T11:00"),
                        leistungsEnde: new Date("2021-04-10T11:30")
                    },
                ]
            }]
        }, {
            versicherter: { ...versicherte[2] },
            eindeutigeBelegnummer: "2021-4321",
            tarifkennzeichen: "",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-02T10:00"),
                leistungen: [
                    {
                        ...teilstationaer,
                        leistungsBeginn: new Date("2021-04-02T10:00"),
                        leistungsEnde: new Date("2021-04-02T18:00")
                    },
                ]
            }]
        }]
    }, {
        leistungserbringer: { ...leistungserbringer[4] },
        rechnungsdatum: new Date("2021-05-03"),
        faelle: [{
            versicherter: { ...versicherte[1] },
            tarifkennzeichen: "",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-03T11:00"),
                leistungen: [
                    {
                        ...leistungskomplex,
                        leistungsBeginn: new Date("2021-04-03T11:00"),
                        leistungsEnde: new Date("2021-04-03T11:30")
                    },
                    { ...wegegebuehrenEinsatzpauschale },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-10T11:00"),
                leistungen: [
                    {
                        ...leistungskomplex,
                        leistungsBeginn: new Date("2021-04-10T11:00"),
                        leistungsEnde: new Date("2021-04-10T11:30")
                    },
                    { ...wegegebuehrenEinsatzpauschale },
                ]
            }]
        }, {
            versicherter: { ...versicherte[4] },
            eindeutigeBelegnummer: "2021-0235",
            tarifkennzeichen: "",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-03T12:00"),
                leistungen: [
                    {
                        ...kurzzeitpflege,
                        leistungsBeginn: new Date("2021-04-03T12:00"),
                        leistungsEnde: new Date("2021-04-11T12:00")
                    },
                ]
            }]
        }, {
            versicherter: { ...versicherte[2] },
            eindeutigeBelegnummer: "2021-0314",
            tarifkennzeichen: "",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-03T11:00"),
                leistungen: [
                    {
                        ...leistungskomplex,
                        leistungsBeginn: new Date("2021-04-03T11:00"),
                        leistungsEnde: new Date("2021-04-03T11:30")
                    },
                    { ...wegegebuehrenEinsatzpauschale },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-10T11:00"),
                leistungen: [
                    {
                        ...beratungsbesuch,
                        leistungsBeginn: new Date("2021-04-10T11:00"),
                        leistungsEnde: new Date("2021-04-10T11:30")
                    },
                ]
            }]
        }, {
            versicherter: { ...versicherte[3] },
            eindeutigeBelegnummer: "2021-0234",
            tarifkennzeichen: "",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-03T12:00"),
                leistungen: [
                    {
                        ...kurzzeitpflege,
                        leistungsBeginn: new Date("2021-04-03T12:00"),
                        leistungsEnde: new Date("2021-04-11T12:00")
                    },
                ]
            }]
        }]
    }] as Invoice[],
};
