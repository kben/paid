import { 
    KostentraegerForDataFindResult,
    KostentraegerForPaperFindResult,
    InstitutionListsIndex,
    Leistungsart
} from "../../src/kostentraeger/index"
import { 
    CareProviderLocationSchluessel,
    Institution,
    InstitutionLink,
    InstitutionList,
} from "../../src/kostentraeger/types"
import { base64ToArrayBuffer } from "../../src/pki/utils"
import { AsnParser } from "@peculiar/asn1-schema"
import { Certificate, Time } from "@peculiar/asn1-x509"
import { exampleKostentraegerCertificatePEM } from "../samples/certificates"
import { readFileSync } from "fs"
import { deserializeInstitutionLists } from "../../src/kostentraeger/json_serializer"
import { DatenlieferungsartSchluessel, sgbxiLeistungsartSonderschluessel } from "../../src/kostentraeger/edifact/codes"

describe("Kostenträger index", () => {

    it("ensure example certificate is not expired", () => {
        try {
            expect(parsedDefaultCertificate.tbsCertificate.validity.notAfter.getTime().getTime())
                .toBeGreaterThan(new Date().getTime())
        } catch (error) {
            console.error("The example certificate has expired which causes likely all other tests "
                + "in this suite to fail. You need to replace it in tests/samples/certificates.ts "
                + "with a valid one from dist/kostentraeger.json (it doesn't really matter which one).");
            throw error
        }
    })

    it("finds kostentraeger when there are no kostentraeger links", () => {
        const kasse = { 
            ...base, 
            ...acceptsData,
            ...linksPapierAndDatenannahmeTo("00000001"),
            ik: "00000001"
        } as Institution

        expect(findForData([institutionListOf([kasse])], "00000001")).toEqual({
            krankenkasse: kasse,
            kostentraeger: kasse,
            encryptTo: kasse,
            certificate: defaultCertificate,
            sendTo: kasse,
            kassenart: "AO",
            papierannahmestellen: {},
            kimTo: null,
        })
    })

    it("finds kostentraeger when there is one simple kostentraeger link", () => {
        const kasse = { 
            ...base, 
            ...acceptsData,
            ...linksPapierAndDatenannahmeTo("00000001"),
            ik: "00000001",
            kostentraegerLinks: [createLink("00000001")],
        } as Institution

        expect(findForData([institutionListOf([kasse])], "00000001")).toEqual({
            krankenkasse: kasse,
            kostentraeger: kasse,
            encryptTo: kasse,
            certificate: defaultCertificate,
            sendTo: kasse,
            kassenart: "AO",
            papierannahmestellen: {},
            kimTo: null,
        })
    })

    it("finds kostentraeger with multiple redirects", () => {
        const kasse1 = { 
            ...base, 
            ik: "00000001",
            kostentraegerLinks: [createLink("00000002")],
        } as Institution

        const kasse2 = { 
            ...base, 
            ik: "00000002",
            kostentraegerLinks: [createLink("00000003")],
        } as Institution

        const kasse3 = { 
            ...base, 
            ...acceptsData,
            ...linksPapierAndDatenannahmeTo("00000003"),
            ik: "00000003",
        } as Institution

        expect(findForData([institutionListOf([kasse1, kasse2, kasse3])], "00000001")).toEqual({
            krankenkasse: kasse1,
            kostentraeger: kasse3,
            encryptTo: kasse3,
            certificate: defaultCertificate,
            sendTo: kasse3,
            kassenart: "AO",
            papierannahmestellen: {},
            kimTo: null,
        })
    })

    it("on finding kostentraeger, does not run into endless loop for circular links", () => {
        const kasse1 = { 
            ...base, 
            ik: "00000001",
            kostentraegerLinks: [createLink("00000002")],
        } as Institution

        const kasse2 = { 
            ...base, 
            ...acceptsData,
            ...linksPapierAndDatenannahmeTo("00000002"),
            ik: "00000002",
            kostentraegerLinks: [createLink("00000001")],
        } as Institution

        expect(findForData([institutionListOf([kasse1, kasse2])], "00000001")).toEqual({
            krankenkasse: kasse1,
            kostentraeger: kasse2,
            encryptTo: kasse2,
            certificate: defaultCertificate,
            sendTo: kasse2,
            kassenart: "AO",
            papierannahmestellen: {},
            kimTo: null,
        })
    })

    it("finds kostenträger with different datenannahmestelle", () => {
        const krankenkasse: Institution = { 
            ...base, 
            ik: "00000001",
            kostentraegerLinks: [{
                ik: "00000002",
                location: null,
                transmissionTypes: [],
                sgbxiLeistungsart: null,
                sgbvAbrechnungscode: null
            }]
        }
        const kostentraeger: Institution = {
            ...base, 
            ik: "00000002",
            datenannahmestelleLinks: [{
                ik: "00000003",
                location: null,
                transmissionTypes: [],
                sgbxiLeistungsart: null,
                sgbvAbrechnungscode: null
            }]
        }
        const datenannahmestelle: Institution = {
            ...base, 
            ik: "00000003",
            transmissionEmail: "default@default.de",
            ...usesDefaultCertificate
        }

        expect(findForData([institutionListOf([krankenkasse, kostentraeger, datenannahmestelle])], "00000001")).toEqual({
            krankenkasse: krankenkasse,
            kostentraeger: kostentraeger,
            encryptTo: datenannahmestelle,
            certificate: defaultCertificate,
            sendTo: datenannahmestelle,
            kassenart: "AO",
            papierannahmestellen: {},
            kimTo: null,
        })
    })

    it("finds kostenträger with different datenannahmestelle and different place to send to", () => {
        const krankenkasse: Institution = { 
            ...base, 
            ik: "00000001",
            kostentraegerLinks: [createLink("00000002")]
        }
        const kostentraeger: Institution = {
            ...base, 
            ik: "00000002",
            datenannahmestelleLinks: [createLink("00000003")]
        }
        const trustedDatenannahmestelle: Institution = {
            ...base, 
            ik: "00000003",
            untrustedDatenannahmestelleLinks: [createLink("00000004")],
            ...usesDefaultCertificate
        }
        const untrustedDatenannahmestelle: Institution = {
            ...base, 
            ik: "00000004",
            transmissionEmail: "default@default.de",
        }

        expect(findForData([institutionListOf([
            krankenkasse,
            kostentraeger,
            trustedDatenannahmestelle,
            untrustedDatenannahmestelle
        ])], "00000001")).toEqual({
            krankenkasse: krankenkasse,
            kostentraeger: kostentraeger,
            encryptTo: trustedDatenannahmestelle,
            certificate: defaultCertificate,
            sendTo: untrustedDatenannahmestelle,
            kassenart: "AO",
            papierannahmestellen: {},
            kimTo: null,
        })
    })

    it("excludes lists for a different Leistungserbringer group", () => {
        expect(findForData(
            [{
                ...institutionListOf([simple]),
                leistungserbringerGruppeSchluessel: "6",  // <- LE-Gruppe 6 but...
            }], 
            defaultIK,
            { leistungsart: { sgbvAbrechnungscode: "11" } }  // <- ...using Abrechnungscode for LE-Gruppe 5
        )).toEqual(undefined)
    })

    it("excludes lists that are not valid yet", () => {
        expect(findForData(
            [{
                ...institutionListOf([simple]),
                validityStartDate: new Date("2010-02-01"), // valid starting then...
            }], 
            defaultIK,
            { date: new Date("2010-01-01") } // ...but "today" is the day before
        )).toEqual(undefined)
    })

    it("when several lists of the same issuer etc. are valid, takes only the most current one", () => {
        expect(findForData(
            [{
                ...institutionListOf([simple]),
                validityStartDate: new Date("2021-01-01"), // older
            },{
                ...institutionListOf( [{...simple, name: "new name"}]),
                validityStartDate: new Date("2021-03-01"), // newer
            }], 
            defaultIK,
            { date: new Date() }
        )?.krankenkasse?.name).toEqual("new name")
    })

    it("excludes single institutions that are not valid", () => {
        expect(findForData(
            [institutionListOf([
                {
                    ...simple,
                    validityFrom: new Date("2020-01-01")    // not valid yet
                }, {
                    ...simple,
                    validityTo: new Date("2010-01-01")    // not valid anymore... nothing left then! 
                }
            ])],
            defaultIK,
            { date: new Date("2016-01-01") }
        )).toEqual(undefined)
    })

    it("excludes single institutions that are not valid when linked to as Kostenträger", () => {
        expect(findForData(
            [institutionListOf([
                { 
                    ...base, 
                    ik: "00000001",
                    kostentraegerLinks: [{
                        ik: "00000002",
                        location: null,
                        transmissionTypes: [],
                        sgbxiLeistungsart: null,
                        sgbvAbrechnungscode: null
                    }]
                }, {
                    ...base, 
                    ...acceptsData,
                    ...linksPapierAndDatenannahmeTo("00000002"),
                    ik: "00000002",
                    validityFrom: new Date("2020-01-01")            // <- not valid yet
                } as Institution
            ])],
            defaultIK,
            { date: new Date("2016-01-01") }  // ...because today is this
        )).toEqual(undefined)
    })

    it("excludes single institutions that are not valid when linked to as Datenannahmestelle", () => {
        expect(findForData(
            [institutionListOf([
                { 
                    ...base, 
                    ik: "00000001",
                    ...linksPapierAndDatenannahmeTo("00000002"),
                } as Institution, {
                    ...base, 
                    ...acceptsData,
                    ik: "00000002",
                    validityFrom: new Date("2020-01-01"),             // <- not valid yet
                } as Institution
            ])],
            defaultIK,
            { date: new Date("2016-01-01") } // ...because today is this
        )).toEqual(undefined)
    })

    /* here only tested for links to Kostenträger because the linking stuff is identical in 
       implementation for all link types... */

    it("heeds the location", () => {
        const kasse = { 
            ...base, 
            ik: "00000001",
            kostentraegerLinks: [
                createLink("00000002", { location: "HH"}), 
                createLink("00000003", { location: "SH"})
            ],
        } as Institution

        const kostentraeger2 = {
            ...base, 
            ...acceptsData,
            ...linksPapierAndDatenannahmeTo("00000002"),
            ik: "00000002"
        } as Institution

        const kostentraeger3 = {
            ...base, 
            ...acceptsData,
            ...linksPapierAndDatenannahmeTo("00000003"),
            ik: "00000003"
        } as Institution

        const institutionLists = [institutionListOf([kasse, kostentraeger2, kostentraeger3])]

        expect(findForData(institutionLists, "00000001",{ location: "SL" })).toEqual(undefined)

        expect(findForData(institutionLists, "00000001",{ location: "HH" })).toEqual({
            krankenkasse: kasse,
            kostentraeger: kostentraeger2,
            encryptTo: kostentraeger2,
            certificate: defaultCertificate,
            sendTo: kostentraeger2,
            kassenart: "AO",
            papierannahmestellen: {},
            kimTo: null,
        })

        expect(findForData(institutionLists, "00000001",{ location: "SH" })).toEqual({
            krankenkasse: kasse,
            kostentraeger: kostentraeger3,
            encryptTo: kostentraeger3,
            certificate: defaultCertificate,
            sendTo: kostentraeger3,
            kassenart: "AO",
            papierannahmestellen: {},
            kimTo: null,
        })
    })

    it("heeds the grouped location", () => {
        const kasse = { 
            ...base, 
            ik: "00000001",
            kostentraegerLinks: [createLink("00000002", { location: "NW"})],
        } as Institution

        const kostentraeger = {
            ...base, 
            ...acceptsData,
            ...linksPapierAndDatenannahmeTo("00000002"),
            ik: "00000002"
        } as Institution

        const institutionLists = [institutionListOf([kasse, kostentraeger])]

        expect(findForData(institutionLists, "00000001",{ location: "HH" })).toEqual(undefined)

        expect(findForData(institutionLists, "00000001",{ location: "Westfalen-Lippe" })).toEqual({
            krankenkasse: kasse,
            kostentraeger: kostentraeger,
            encryptTo: kostentraeger,
            certificate: defaultCertificate,
            sendTo: kostentraeger,
            kassenart: "AO",
            papierannahmestellen: {},
            kimTo: null,
        })
    })

    it("heeds the sgbxiLeistungsart", () => {
        const kasse: Institution = { 
            ...base, 
            ik: "00000001",
            kostentraegerLinks: [{
                ik: "00000002",
                sgbxiLeistungsart: "05",
                location: null,
                transmissionTypes: [],
                sgbvAbrechnungscode: null,
            },{
                ik: "00000003",
                sgbxiLeistungsart: "99", // <- = "Rest"
                location: null,
                transmissionTypes: [],
                sgbvAbrechnungscode: null,
            }],
        }

        const kostentraeger2: Institution = {
            ...base, 
            ...acceptsData,
            ...linksPapierAndDatenannahmeTo("00000002"),
            ik: "00000002"
        }

        const kostentraeger3: Institution = {
            ...base, 
            ...acceptsData,
            ...linksPapierAndDatenannahmeTo("00000003"),
            ik: "00000003"
        }

        const institutionLists = [institutionListOf([kasse, kostentraeger2, kostentraeger3])]

        expect(findForData(institutionLists, "00000001", { leistungsart: { sgbxiLeistungsart: "05" }})).toEqual({
            krankenkasse: kasse,
            kostentraeger: kostentraeger2,
            encryptTo: kostentraeger2,
            certificate: defaultCertificate,
            sendTo: kostentraeger2,
            kassenart: "AO",
            papierannahmestellen: {},
            kimTo: null,
        })

        expect(findForData(institutionLists, "00000001",{ leistungsart: { sgbxiLeistungsart: "08" } })).toEqual({
            krankenkasse: kasse,
            kostentraeger: kostentraeger3,
            encryptTo: kostentraeger3,
            certificate: defaultCertificate,
            sendTo: kostentraeger3,
            kassenart: "AO",
            papierannahmestellen: {},
            kimTo: null,
        })
    })

    it("heeds the sgbvLeistungsart", () => {
        const kasse: Institution = { 
            ...base, 
            ik: "00000001",
            kostentraegerLinks: [{
                ik: "00000002",
                sgbvAbrechnungscode: "31",
                location: null,
                transmissionTypes: [],
                sgbxiLeistungsart: null
            },{
                ik: "00000003",
                sgbvAbrechnungscode: "99", // <- = "Rest"
                location: null,
                transmissionTypes: [],
                sgbxiLeistungsart: null
            }],
        }

        const kostentraeger2: Institution = {
            ...base, 
            ...acceptsData,
            ...linksPapierAndDatenannahmeTo("00000002"),
            ik: "00000002"
        }

        const kostentraeger3: Institution = {
            ...base, 
            ...acceptsData,
            ...linksPapierAndDatenannahmeTo("00000003"),
            ik: "00000003"
        }

        const institutionLists: InstitutionList[] = [{
            ...institutionListOf([kasse, kostentraeger2, kostentraeger3]),
            leistungserbringerGruppeSchluessel: "5"
        }]

        expect(findForData(institutionLists, "00000001", { leistungsart: { sgbvAbrechnungscode: "31" }})).toEqual({
            krankenkasse: kasse,
            kostentraeger: kostentraeger2,
            encryptTo: kostentraeger2,
            certificate: defaultCertificate,
            sendTo: kostentraeger2,
            kassenart: "AO",
            papierannahmestellen: {},
            kimTo: null,
        })

        expect(findForData(institutionLists, "00000001",{ leistungsart: { sgbvAbrechnungscode: "60" } })).toEqual({
            krankenkasse: kasse,
            kostentraeger: kostentraeger3,
            encryptTo: kostentraeger3,
            certificate: defaultCertificate,
            sendTo: kostentraeger3,
            kassenart: "AO",
            papierannahmestellen: {},
            kimTo: null,
        })
    })

    it("heeds the grouped sgbvLeistungsart", () => {
        const kasse: Institution = { 
            ...base, 
            ik: "00000001",
            kostentraegerLinks: [{
                ik: "00000002",
                sgbvAbrechnungscode: "30",
                location: null,
                transmissionTypes: [],
                sgbxiLeistungsart: null
            }],
        }

        const kostentraeger: Institution = {
            ...base, 
            ...acceptsData,
            ...linksPapierAndDatenannahmeTo("00000002"),
            ik: "00000002"
        }

        const institutionLists: InstitutionList[] = [{
            ...institutionListOf([kasse, kostentraeger]),
            leistungserbringerGruppeSchluessel: "5"
        }]

        expect(findForData(institutionLists, "00000001", { leistungsart: { sgbvAbrechnungscode: "31" }})).toEqual({
            krankenkasse: kasse,
            kostentraeger: kostentraeger,
            encryptTo: kostentraeger,
            certificate: defaultCertificate,
            sendTo: kostentraeger,
            kassenart: "AO",
            papierannahmestellen: {},
            kimTo: null,
        })
        expect(findForData(institutionLists, "00000001", { leistungsart: { sgbvAbrechnungscode: "32" }})).toEqual({
            krankenkasse: kasse,
            kostentraeger: kostentraeger,
            encryptTo: kostentraeger,
            certificate: defaultCertificate,
            sendTo: kostentraeger,
            kassenart: "AO",
            papierannahmestellen: {},
            kimTo: null,
        })
        expect(findForData(institutionLists, "00000001", { leistungsart: { sgbvAbrechnungscode: "41" }})).toEqual(undefined)
    })

    it("heeds both the location and leistungsart", () => {
        const kasse: Institution = { 
            ...base, 
            ik: "00000001",
            kostentraegerLinks: [{
                ik: "00000002",
                location: "HH",
                sgbxiLeistungsart: "05",
                transmissionTypes: [],
                sgbvAbrechnungscode: null
            }],
        }

        const kostentraeger: Institution = {
            ...base, 
            ...acceptsData,
            ...linksPapierAndDatenannahmeTo("00000002"),
            ik: "00000002",
        }

        const institutionLists = [institutionListOf([kasse, kostentraeger])]

        expect(findForData(
            institutionLists,
            "00000001",
            { location: "SL", leistungsart: { sgbxiLeistungsart: "05"} }
        )).toEqual(undefined)

        expect(findForData(
            institutionLists,
            "00000001",
            { location: "HH", leistungsart: { sgbxiLeistungsart: "06"} }
        )).toEqual(undefined)

        expect(findForData(
            institutionLists,
            "00000001",
            { location: "HH", leistungsart: { sgbxiLeistungsart: "05"} }
        )).toEqual({
            krankenkasse: kasse,
            kostentraeger: kostentraeger,
            encryptTo: kostentraeger,
            certificate: defaultCertificate,
            sendTo: kostentraeger,
            kassenart: "AO",
            papierannahmestellen: {},
            kimTo: null,
        })
    })

    it("links to specific location take precedence over others", () => {
        const kasse = { 
            ...base, 
            ik: "00000001",
            kostentraegerLinks: [
                createLink("00000002", { location: "HH"}),
                createLink("00000003"),
            ],
        } as Institution

        const kostentraeger2 = {
            ...base, 
            ...acceptsData,
            ...linksPapierAndDatenannahmeTo("00000002"),
            ik: "00000002"
        } as Institution

        const kostentraeger3 = {
            ...base, 
            ...acceptsData,
            ...linksPapierAndDatenannahmeTo("00000003"),
            ik: "00000003"
        } as Institution

        expect(findForData(
            [institutionListOf([kasse, kostentraeger2, kostentraeger3])],
            "00000001",
            { location: "HH" }
        )).toEqual({
            krankenkasse: kasse,
            kostentraeger: kostentraeger2,
            encryptTo: kostentraeger2,
            certificate: defaultCertificate,
            sendTo: kostentraeger2,
            kassenart: "AO",
            papierannahmestellen: {},
            kimTo: null,
        })

        // make sure that the previous test didn't just succeed because of the order
        expect(findForData(
            [institutionListOf([kasse, kostentraeger3, kostentraeger2])], // <- different order
            "00000001",
            { location: "HH" }
        )).toEqual({
            krankenkasse: kasse,
            kostentraeger: kostentraeger2,
            encryptTo: kostentraeger2,
            certificate: defaultCertificate,
            sendTo: kostentraeger2,
            kassenart: "AO",
            papierannahmestellen: {},
            kimTo: null,
        })
    })

    it("finds papierannahmestelle", () => {
        const kasse = { 
            ...base, 
            papierannahmestelleLinks: [{
                ik: "00000001",
                transmissionTypes: ["21"]
            }, {
                ik: "00000001",
                transmissionTypes: ["28"]
            }],
            ik: "00000001"
        } as Institution
        const institutionList = [institutionListOf([kasse])]

        expect(findForPaper(institutionList, "00000001")).toEqual({
            krankenkasse: kasse,
            kostentraeger: kasse,
            kassenart: "AO",
            papierannahmestellen: {
                "21": kasse,
                "28": kasse,
            }
        })

        const kasse2 = { 
            ...base,
            papierannahmestelleLinks: [{
                ik: "00000001",
                transmissionTypes: ["28"]
            }],
            ik: "00000001"
        } as Institution

        const institutionList2 = [institutionListOf([kasse2])]

        expect(findForPaper(institutionList2, "00000001")).toEqual({
            krankenkasse: kasse2,
            kostentraeger: kasse2,
            kassenart: "AO",
            papierannahmestellen: {
                "28": kasse2,
            }
        })
    })

    it("excludes results for datenannahmestelle without certificate", () => {
        const kasse: Institution = { 
            ...base, 
            ...acceptsData,
            ...linksPapierAndDatenannahmeTo("00000001"),
            ik: "00000001",
            certificates: []
        }

        expect(findForData([institutionListOf([kasse])], "00000001")).toBeUndefined()
    })

    it("excludes results for datenannahmestelle with expired certificate", () => {
        const expiredCertificate: Certificate = parseCertificate(certificatePEM)
        expiredCertificate.tbsCertificate.validity.notBefore = new Time(new Date("2010-01-01"))
        expiredCertificate.tbsCertificate.validity.notAfter = new Time(new Date("2012-01-01"))

        const kasse = { 
            ...base, 
            ...acceptsData,
            ...linksPapierAndDatenannahmeTo("00000001"),
            certificates: [expiredCertificate],
            ik: "00000001"
        } as Institution

        expect(findForData([institutionListOf([kasse])], "00000001", {
            date: new Date("2012-01-02"),
        })).toBeUndefined()
    })

    it("finds kostentraeger and uses the newer certificate for result if there are several", () => {
        const oldCertificate: Certificate = parseCertificate(certificatePEM)
        oldCertificate.tbsCertificate.validity.notBefore = new Time(new Date("2010-01-01"))
        oldCertificate.tbsCertificate.validity.notAfter = new Time(new Date("2020-01-01"))
        
        const newCertificate: Certificate = parseCertificate(certificatePEM)
        newCertificate.tbsCertificate.validity.notBefore = new Time(new Date("2010-01-01"))
        newCertificate.tbsCertificate.validity.notAfter = new Time(new Date("2022-01-01"))

        const kasse = { 
            ...base, 
            ...acceptsData,
            ...linksPapierAndDatenannahmeTo("00000001"),
            certificates: [oldCertificate, newCertificate],
            ik: "00000001"
        } as Institution

        const certificate = findForData(
                [institutionListOf([kasse])],
                "00000001", {
                date: new Date("2011-01-01"),
            })!.certificate

        expect(certificate).not.toBeUndefined();
        expect(AsnParser.parse(certificate!, Certificate)).toEqual(newCertificate)
    })

    it("finds kostentraeger for LE-Gruppe 6 (SGB XI) if krankenkasse IK is not in institution list, but the same IK except starting with 18… instead of 10…", () => {
        const kasse = {
            ...base,
            ...acceptsData,
            ...linksPapierAndDatenannahmeTo("184212505"),
            ik: "184212505",
            kostentraegerLinks: [createLink("184212505")],
        } as Institution

        const result = findForData(
            [institutionListOf([kasse])],
            "104212505"
        ) || null;
        expect(result).not.toBeNull();
        expect(result?.krankenkasse.ik).toEqual("184212505");
    })

    it("finds KIM recipient", () => {
        const kasse1: Institution = {
            ...base,
            kostentraegerLinks: [createLink("000000001")],
            datenannahmestelleLinks: [createLink("000000002", { transmissionTypes: ["30"] })],
            ik: "000000001",
        }
        const kasse2: Institution = {
            ...base,
            ik: "000000002",
            kim: "hello@example.kim"
        }

        const result = findForData(
            [institutionListOf([kasse1, kasse2])],
            "000000001",
            { supportedTransmissionTypes: ["30"] }
        ) || null;
        expect(result).not.toBeNull();
        expect(result?.kostentraeger.ik).toEqual("000000001");
        expect(result?.kimTo?.ik).toEqual("000000002");
    })
})

const parseCertificate = (certPEM: string): Certificate =>
    AsnParser.parse(base64ToArrayBuffer(certPEM), Certificate)

const certificatePEM = exampleKostentraegerCertificatePEM()

const defaultIK: string = "00000000"
const defaultCertificate = new Uint8Array(base64ToArrayBuffer(certificatePEM))
const parsedDefaultCertificate = parseCertificate(certificatePEM)

const institutionListOf = (institutions: Institution[]): InstitutionList => ({
    issuerIK: "00000000",
    leistungserbringerGruppeSchluessel: "6",
    kassenart: "AO",
    validityStartDate: new Date("2000-01-01"),
    institutions,
    caCertificates: [],
})

/* Default institution with just the necessary info */
const base: Institution = {
    ik: defaultIK,
    name: "default name",
    abbreviatedName: "default abbr. name",
    contacts: [],
    addresses: [{
        postcode: "00000",
        place: "default place"
    }],
    kostentraegerLinks: [],
    datenannahmestelleLinks: [],
    untrustedDatenannahmestelleLinks: [],
    papierannahmestelleLinks: [],
    vertragskassennummer: null,
    validityFrom: null,
    validityTo: null,
    transmissionEmail: null,
    certificates: null,
    kim: null
}

/* Merge with base to get an institution that links to itself for data and paper acceptance */
const linksPapierAndDatenannahmeTo = (ik: string) => ({
    datenannahmestelleLinks: [createLink(ik)],
    papierannahmestelleLinks: [createLink(ik)]
})

const createLink = (ik: string, data: Partial<InstitutionLink> = {}): InstitutionLink => ({
    ik,
    location: null,
    transmissionTypes: [],
    sgbxiLeistungsart: null,
    sgbvAbrechnungscode: null,
    ...data,
})

const usesDefaultCertificate = {
    certificates: [parsedDefaultCertificate]
}

const acceptsData = {
    ...usesDefaultCertificate,
    transmissionEmail: "default@default.de"
}

const simple = { ...base, ...acceptsData, ...linksPapierAndDatenannahmeTo(defaultIK) } as Institution

type OptFindParams = {
    leistungsart?: Leistungsart,
    location?: CareProviderLocationSchluessel,
    supportedTransmissionTypes?: DatenlieferungsartSchluessel[],
    date?: Date
}

function findForPaper(
    institutionLists: InstitutionList[],
    krankenkasseIK: string,
    {
        leistungsart = { sgbxiLeistungsart: "01" },
        location = "HH",
        date = new Date()
    }: OptFindParams = {}
): KostentraegerForPaperFindResult | undefined {
    return new InstitutionListsIndex(institutionLists).findForPaper(
        krankenkasseIK, leistungsart, location, date
    )
}

function findForData(
    institutionLists: InstitutionList[],
    krankenkasseIK: string,
    {
        leistungsart = { sgbxiLeistungsart: "01" },
        location = "HH",
        supportedTransmissionTypes = ["07"],
        date = new Date()
    }: OptFindParams = {}
): KostentraegerForDataFindResult | undefined {
    return new InstitutionListsIndex(institutionLists).findForData(
        krankenkasseIK, leistungsart, location, supportedTransmissionTypes, date
    )
}