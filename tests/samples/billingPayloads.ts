import {
    BillingData,
    Invoice,
    Leistung, 
    Leistungserbringer, 
    Versicherter,
} from "../../src/types";

const leistungserbringer: Leistungserbringer[] = [{
    name: "Pflegedienst Musterstadt GmbH",
    ik: "0000000110",
    ansprechpartner: [{
        name: "Sven Bauer",
        phone: "012 34567-8",
    }],
    absenderIK: "0000000110",
    rechnungsstellerIK: "0000000110",
    abrechnungscode: "36",
    tarifbereich: "00",
    umsatzsteuerBefreiung: "01",
    sondertarifJeKostentraegerIK: {},
}, {
    name: "Nachbarschaftspflege in Wilhelmsburg gGmbH",
    ik: "0000000120",
    ansprechpartner: [{
        name: "Laila Neumann",
        phone: "012 34567",
    }],
    absenderIK: "0000000210",
    rechnungsstellerIK: "0000000120",
    abrechnungscode: "35",
    tarifbereich: "05",
    umsatzsteuerBefreiung: "01",
    sondertarifJeKostentraegerIK: {
        "0000000010": "011"
    },
}, {
    name: "Quartierspflege Neuhausen GmbH",
    ik: "0000000130",
    ansprechpartner: [{
        name: "Ben Peters",
        phone: "012 3456789",
    }],
    absenderIK: "0000000210",
    rechnungsstellerIK: "0000000130",
    abrechnungscode: "36",
    tarifbereich: "02",
    umsatzsteuerBefreiung: "",
    sondertarifJeKostentraegerIK: {},
}, {
    name: "Von Mensch zu Mensch gGmbH",
    ik: "0000000140",
    ansprechpartner: [{
        name: "Lena Wolf",
        phone: "0123 456789",
    }],
    absenderIK: "0000000310",
    rechnungsstellerIK: "0000000310",
    abrechnungscode: "35",
    tarifbereich: "01",
    umsatzsteuerBefreiung: "01",
    sondertarifJeKostentraegerIK: {},
}, {
    name: "Pflegedienst Neukölln GmbH",
    ik: "0000000150",
    ansprechpartner: [{
        name: "Yvonne Zimmermann",
        phone: "0123 456789",
    }],
    absenderIK: "0000000310",
    rechnungsstellerIK: "0000000310",
    abrechnungscode: "36",
    tarifbereich: "23",
    umsatzsteuerOrdnungsnummer: "012/345/67890",
    umsatzsteuerBefreiung: "",
    sondertarifJeKostentraegerIK: {},
}]

const versicherte: Versicherter[] = [{
    pflegekasseIK: "0000000010",
    kostentraegerIK: "0000000010",
    versichertennummer: "0123456789",
    pflegegrad: "3",
    firstName: "Gertrud",
    lastName: "Fischer",
    birthday: new Date("1938-03-01"),
    street: "Musterstraße",
    houseNumber: "1",
    postalCode: "12345",
    city: "Musterstadt",
}, {
    pflegekasseIK: "0000000010",
    kostentraegerIK: "0000000010",
    versichertennummer: "0123456789",
    pflegegrad: "2",
    firstName: "Jürgen",
    lastName: "Weber",
    birthday: new Date("1941-09-02"),
    street: "Musterstraße",
    houseNumber: "2",
    postalCode: "12345",
    city: "Musterstadt",
}, {
    pflegekasseIK: "0000000020",
    kostentraegerIK: "0000000021",
    versichertennummer: "0123456789",
    pflegegrad: "4",
    firstName: "Paul",
    lastName: "Hofmann",
    birthday: new Date("1932-11-03"),
    street: "Musterstraße",
    houseNumber: "3",
    postalCode: "12345",
    city: "Musterstadt",
}, {
    pflegekasseIK: "0000000030",
    kostentraegerIK: "0000000031",
    versichertennummer: "0123456789",
    pflegegrad: "4",
    firstName: "Sabine",
    lastName: "Schwarz",
    birthday: new Date("1942-10-04"),
    street: "Musterstraße",
    houseNumber: "4",
    postalCode: "12345",
    city: "Musterstadt",
}, {
    pflegekasseIK: "0000000040",
    kostentraegerIK: "0000000040",
    versichertennummer: "0123456789",
    pflegegrad: "1",
    firstName: "Ingeborg",
    lastName: "Wagner",
    birthday: new Date("1936-02-05"),
    street: "Musterstraße",
    houseNumber: "5",
    postalCode: "12345",
    city: "Musterstadt",
}, {
    pflegekasseIK: "0000000030",
    kostentraegerIK: "0000000031",
    versichertennummer: "0123456789",
    pflegegrad: "2",
    firstName: "Robert",
    lastName: "Schäfer",
    birthday: new Date("1937-06-06"),
    street: "Musterstraße",
    houseNumber: "6",
    postalCode: "12345",
    city: "Musterstadt",
}, {
    pflegekasseIK: "0000000050",
    kostentraegerIK: "0000000050",
    versichertennummer: "0123456789",
    pflegegrad: "2",
    firstName: "Małgorzata",
    lastName: "Dąbrowski",
    birthday: new Date("1946-08-07"),
}]

// Leistungen

const leistungskomplex: Leistung = {
    leistungsart: "01",
    verguetungsart: "01",
    qualifikationsabhaengigeVerguetung: "1",
    leistung: "001",
    einzelpreis: 28.37,
    anzahl: 1,
    leistungsBeginn: new Date("2021-04-02T11:00"),
    leistungsEnde: new Date("2021-04-02T11:30"),
    punktwert: 0.06114,
    punktzahl: 464,
    zuschlaege: [],
};
const zeitverguetung: Leistung = {
    leistungsart: "06",
    verguetungsart: "02",
    qualifikationsabhaengigeVerguetung: "1",
    leistung: "13",
    einzelpreis: 45.45,
    anzahl: 1,
    leistungsBeginn: new Date("2021-04-02T10:00"),
    leistungsEnde: new Date("2021-04-02T11:00"),
    zuschlaege: [],
};
const zeitMitZuschlag: Leistung = {
    leistungsart: "06",
    verguetungsart: "02",
    qualifikationsabhaengigeVerguetung: "1",
    leistung: "13",
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
    }],
};
const wegegebuehrenEinsatzpauschale: Leistung = {
    leistungsart: "06",
    verguetungsart: "06",
    qualifikationsabhaengigeVerguetung: "1",
    leistung: "03",
    einzelpreis: 2,
    anzahl: 1,
    zuschlaege: [],
};
const wegegebuehrenKilometer: Leistung = {
    leistungsart: "06",
    verguetungsart: "06",
    qualifikationsabhaengigeVerguetung: "1",
    leistung: "04",
    einzelpreis: 0.4,
    anzahl: 1,
    gefahreneKilometer: 5,
    zuschlaege: [],
};
const pflegehilfsmittel: Leistung = {
    leistungsart: "06",
    verguetungsart: "05",
    qualifikationsabhaengigeVerguetung: "0",
    leistung: "0000000000",
    einzelpreis: 123.45,
    anzahl: 1,
    zuschlaege: [],
    hilfsmittel: {
        mehrwertsteuerart: "1",
        zuzahlungsbetrag: 10.12,
        genehmigungskennzeichen: "genehmigt_123",
        genehmigungsdatum: new Date("2021-03-01"),
        kennzeichenPflegehilfsmittel: "00",
        bezeichnungPflegehilfsmittel: "Rollator",
    },
};
const beratungsbesuch: Leistung = {
    leistungsart: "09",
    verguetungsart: "08",
    qualifikationsabhaengigeVerguetung: "1",
    leistung: "1",
    einzelpreis: 32,
    anzahl: 1,
    leistungsBeginn: new Date("2021-04-03T13:00"),
    leistungsEnde: new Date("2021-04-03T13:30"),
    zuschlaege: [],
};
const teilstationaer: Leistung = {
    leistungsart: "02",
    verguetungsart: "03",
    qualifikationsabhaengigeVerguetung: "1",
    leistung: "01",
    einzelpreis: 42.84,
    anzahl:1,
    leistungsBeginn: new Date("2021-04-02T10:00"),
    leistungsEnde: new Date("2021-04-02T18:00"),
    zuschlaege: [],
};
const kurzzeitpflege: Leistung = {
    leistungsart: "04",
    verguetungsart: "04",
    qualifikationsabhaengigeVerguetung: "1",
    leistung: "00",
    einzelpreis: 234.56,
    anzahl: 8,
    leistungsBeginn: new Date("2021-04-03T12:00"),
    leistungsEnde: new Date("2021-04-11T12:00"),
    zuschlaege: [],
};

// Nutzdaten

export const payload1 = {
    billingData: {
        dateiindikator: "0",
        rechnungsart: "1",
        rechnungsnummerprefix: "2021-0087",
        rechnungsdatum: new Date("2021-05-03"),
        abrechnungsmonat: new Date("2021-04-01"),
        datenaustauschreferenzJeEmpfaengerIK: {},
        laufendeDatenannahmeImJahrJeEmpfaengerIK: {}
    } as BillingData,
    invoices: [{
        leistungserbringer: {...leistungserbringer[0]},
        faelle: [{
            versicherter: {...versicherte[0]},
            eindeutigeBelegnummer: "2021-1234",
            einsaetze: [{
                leistungsBeginn: new Date("2021-03-31"),
                leistungen: [
                    { ...leistungskomplex },
                    { ...wegegebuehrenKilometer },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-02"),
                leistungen: [
                    { ...leistungskomplex },
                    { ...wegegebuehrenKilometer },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-04"),
                leistungen: [
                    { ...zeitverguetung },
                    { ...wegegebuehrenEinsatzpauschale },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-04"),
                leistungen: [
                    { ...zeitMitZuschlag },
                    { ...pflegehilfsmittel },
                    { ...wegegebuehrenEinsatzpauschale },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-06"),
                leistungen: [
                    { ...beratungsbesuch },
                ]
            }]
        }, {
            versicherter: {...versicherte[2]},
            eindeutigeBelegnummer: "2021-1235",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-03"),
                leistungen: [
                    { ...zeitverguetung },
                    { ...wegegebuehrenEinsatzpauschale }
                ]
            }, {
                leistungsBeginn: new Date("2021-04-07"),
                leistungen: [
                    { ...beratungsbesuch }
                ]
            }]
        }]
    }] as Invoice[],
};

export const payload2 = {
    billingData: {
        dateiindikator: "0",
        rechnungsart: "2",
        rechnungsnummerprefix: "2021-00267",
        abrechnungsmonat: new Date("2021-04-01"),
        datenaustauschreferenzJeEmpfaengerIK: {},
        laufendeDatenannahmeImJahrJeEmpfaengerIK: {}
    } as BillingData,
    invoices: [{
        leistungserbringer: { ...leistungserbringer[1] },
        faelle: [{
            versicherter: { ...versicherte[1] },
            eindeutigeBelegnummer: "2021-2893",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-05"),
                leistungen: [
                    { ...zeitverguetung },
                    { ...pflegehilfsmittel },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-08"),
                leistungen: [
                    { ...zeitverguetung },
                ]
            }]
        }, {
            versicherter: { ...versicherte[3] },
            eindeutigeBelegnummer: "2021-2894",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-05"),
                leistungen: [
                    { ...zeitverguetung },
                    { ...pflegehilfsmittel },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-08"),
                leistungen: [
                    { ...zeitverguetung },
                ]
            }]
        }]
    }, {
        leistungserbringer: { ...leistungserbringer[2] },
        faelle: [{
            versicherter: { ...versicherte[4] },
            eindeutigeBelegnummer: "2021-354",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-05"),
                leistungen: [
                    { ...zeitverguetung },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-08"),
                leistungen: [
                    { ...leistungskomplex },
                ]
            }]
        }, {
            versicherter: { ...versicherte[5] },
            eindeutigeBelegnummer: "2021-355",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-05"),
                leistungen: [
                    { ...zeitverguetung },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-08"),
                leistungen: [
                    { ...beratungsbesuch },
                ]
            }]
        }]
    }] as Invoice[],
};

export const payload3 = {
    billingData: {
        dateiindikator: "0",
        rechnungsart: "3",
        rechnungsnummerprefix: "2021-00398",
        rechnungsdatum: new Date("2021-05-03"),
        abrechnungsmonat: new Date("2021-04-01"),
        abrechnungsstelle: {
            name: "PAID Abrechnungszentrum eG",
            ik: "00000310",
            ansprechpartner: [{
                name: "Sonja Braun",
                phone: "01234 5678-9",
            }, {
                name: "Josef Klein"
            }]
        },
        datenaustauschreferenzJeEmpfaengerIK: {},
        laufendeDatenannahmeImJahrJeEmpfaengerIK: {}
    } as BillingData,
    invoices: [{
        leistungserbringer: { ...leistungserbringer[3] },
        faelle: [{
            versicherter: { ...versicherte[6] },
            eindeutigeBelegnummer: "2021-0413",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-03"),
                leistungen: [
                    { ...zeitverguetung}
                ]
            }, {
                leistungsBeginn: new Date("2021-04-10"),
                leistungen: [
                    { ...zeitverguetung }
                ]
            }]
        }, {
            versicherter: { ...versicherte[0] },
            eindeutigeBelegnummer: "2021-0414",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-03"),
                leistungen: [
                    { ...zeitverguetung }
                ]
            }, {
                leistungsBeginn: new Date("2021-04-10"),
                leistungen: [
                    { ...beratungsbesuch }
                ]
            }]
        }]
    }, {
        leistungserbringer: { ...leistungserbringer[4] },
        faelle: [{
            versicherter: { ...versicherte[1] },
            eindeutigeBelegnummer: "2021-0313",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-03"),
                leistungen: [
                    { ...leistungskomplex },
                    {... wegegebuehrenEinsatzpauschale},
                ]
            }, {
                leistungsBeginn: new Date("2021-04-10"),
                leistungen: [
                    { ...leistungskomplex },
                    { ...wegegebuehrenEinsatzpauschale },
                ]
            }]
        }, {
            versicherter: { ...versicherte[2] },
            eindeutigeBelegnummer: "2021-0314",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-03"),
                leistungen: [
                    { ...leistungskomplex },
                    { ...wegegebuehrenEinsatzpauschale },
                ]
            }, {
                leistungsBeginn: new Date("2021-04-10"),
                leistungen: [
                    { ...beratungsbesuch }
                ]
            }]
        }]
    }, {
        leistungserbringer: { ...leistungserbringer[3] },
        faelle: [{
            versicherter: { ...versicherte[2] },
            eindeutigeBelegnummer: "2021-4321",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-02"),
                leistungen: [
                    { ...teilstationaer },
                ]
            }]
        }]
    }, {
        leistungserbringer: { ...leistungserbringer[4] },
        faelle: [{
            versicherter: { ...versicherte[3] },
            eindeutigeBelegnummer: "2021-0234",
            einsaetze: [{
                leistungsBeginn: new Date("2021-04-03"),
                leistungen: [
                    { ...kurzzeitpflege },
                ]
            }]
        }]
    }] as Invoice[],
};
