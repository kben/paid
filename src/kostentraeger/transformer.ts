import { AsnSerializer } from "@peculiar/asn1-schema"
import { 
    BundeslandSchluessel,
    KostentraegerSGBVAbrechnungscodeSchluessel,
    KostentraegerSGBXILeistungsartSchluessel,
    KVBezirkSchluessel, 
    LeistungserbringergruppeSchluessel
} from "./edifact/codes"
import { KOTRInterchange, KOTRMessage, ANS, ASP, VKG } from "./edifact/segments"
import { VerfahrenSchluessel } from "./filename/codes"
import { 
    Address, 
    Contact, 
    Institution, 
    InstitutionLink, 
    InstitutionListParseResult,
    KVLocationSchluessel
} from "./types"
import { Certificate } from '@peculiar/asn1-x509'
import { bufferToCertificate } from "../pki/utils"


const bundeslandSchluesselToKVLocation = 
    new Map<BundeslandSchluessel, KVLocationSchluessel>([
        ["01", "SH"],
        ["02", "HH"],
        ["03", "NI"],
        ["04", "HB"],
        ["05", "NW"],
        ["06", "HE"],
        ["07", "RP"],
        ["08", "BW"],
        ["09", "BY"],
        ["10", "SL"],
        ["11", "BE"],
        ["12", "BB"],
        ["13", "MV"],
        ["14", "SN"],
        ["15", "ST"],
        ["16", "TH"]
    ])

const kvBezirkSchluesselToKVLocation = 
    new Map<KVBezirkSchluessel, KVLocationSchluessel>([
        ["01", "SH"],
        ["02", "HH"],
        ["03", "HB"],
        ["17", "NI"],
        ["20", "Westfalen-Lippe"],
        ["38", "Nordrhein"],
        ["46", "HE"],
        ["71", "BY"],
        ["72", "BE"],
        ["73", "SL"],
        ["78", "MV"],
        ["83", "BB"],
        ["88", "ST"],
        ["93", "TH"],
        ["98", "SN"]
    ])


export default function transform(pkeys: Map<string, Certificate[]>, interchange: KOTRInterchange): InstitutionListParseResult {

    const validityStartDate = interchange.filename.validityStartDate

    const warnings: string[] = []
    const institutions = interchange.institutions.map((msg) => {
        try {
            return transformMessage(pkeys, msg, validityStartDate)
        } catch(e: any) {
            warnings.push(e.message)
        }
    }).filter((msg): msg is Institution => !!msg)

    warnings.push(...validateLinks(institutions))

    return {
        institutionList: {
            issuerIK: interchange.issuerIK,
            leistungserbringerGruppeSchluessel: verfahrenToLeistungserbringergruppeSchluessel(interchange.filename.verfahren),
            kassenart: interchange.filename.kassenart,
            validityStartDate: validityStartDate,
            institutions: institutions,
            caCertificates: pkeys.get("CA")?.map(cert => bufferToCertificate(AsnSerializer.serialize(cert))) || [],
        },
        warnings: warnings
    }
}

function validateLinks(institutions: Institution[]): string[] {
    const warnings: string[] = []
    const institutionsByIK = new Map<string, Institution>()
    institutions.forEach((institution) => {
        institutionsByIK.set(institution.ik, institution)
    })

    institutions.forEach((institution) => {
        const errMsg = `IK ${institution.ik} (${institution.abbreviatedName})`

        if (institution.datenannahmestelleLinks 
            && !institution.datenannahmestelleLinks.find(link => 
                link.transmissionTypes.includes("07") || !link.transmissionTypes.length
            )
        ) {
            if (institution.datenannahmestelleLinks.find(link => link.transmissionTypes.includes("30"))) {
                warnings.push(`${errMsg} has no links with Datenlieferungsart "07" (DTA), but with "30" (KIM)`)
            } else {
                warnings.push(`${errMsg} has no links with Datenlieferungsart "07" (DTA) or "30" (KIM)`)
            }
        }

        /* the link target to every link to a Datenannahme with capacity to decrypt must 
            either accept email themselves or lead to one that does in one link-step */
        institution.datenannahmestelleLinks?.forEach((link) => {
            const da = institutionsByIK.get(link.ik)
            // only look at DTA links
            if (link.transmissionTypes.includes("07") || !link.transmissionTypes.length) {
                if (!da?.transmissionEmail) {
                    const butALinkAcceptsData = da?.untrustedDatenannahmestelleLinks?.some((link2) => {
                        const uda = institutionsByIK.get(link2.ik)
                        return !!(uda?.transmissionEmail)
                    })
                    if (!butALinkAcceptsData) {
                        warnings.push(`${errMsg} links to IK ${link.ik} for data but neither that IK nor an IK it links to accepts SMTP (email)`)
                    }
                }
                /** each Datenannahme with capacity to decrypt must have a certificate */
                if (!da?.certificates) {
                    warnings.push(`${errMsg} links to IK ${link.ik} for data but there is not any certificate for encryption`)
                }

            // only look at KIM links
            } else if (link.transmissionTypes.includes("30") || !link.transmissionTypes.length) {
                if (!da?.kim) {
                    warnings.push(`${errMsg} links to IK ${link.ik} for data but there is no KIM address`)
                }
            }
        })

        // only institutions with Datenannahmestelle for SGB XI Leistungen via DTA
        if (institution.datenannahmestelleLinks?.length && institution.datenannahmestelleLinks.find(link => 
            link.sgbxiLeistungsart && (link.transmissionTypes.includes("07") || !link.transmissionTypes.length)
        )) {
            if (institution.papierannahmestelleLinks == undefined) {
                warnings.push(`${errMsg} has no Papierannahmestelle`)
            }
            if (institution.papierannahmestelleLinks?.filter(link => link.transmissionTypes.includes("28")).length == 0) {
                warnings.push(`${errMsg} has no Papierannahmestelle for Datenlieferungsart "28" (Urbelege zu einer digitalen Abrechnung)`)
            }
            // too many matches:
            // if (institution.papierannahmestelleLinks?.filter(link => link.transmissionTypes.includes("21")).length == 0) {
            //     warnings.push(`${errMsg} has no Papierannahmestelle for Datenlieferungsart "21" (Rechnung Papier)`)
            // }
        }
    })
    return warnings
}


function verfahrenToLeistungserbringergruppeSchluessel(verfahren: VerfahrenSchluessel): LeistungserbringergruppeSchluessel {
    switch(verfahren) {
        case "05": return "5"
        case "06": return "6"
    }
    throw new Error(`Expected Kostenträger file Verfahren to be "05" or "06" but was "${verfahren}"`)
}


function transformMessage(
    certificatesByIK: Map<string, Certificate[]>,
    msg: KOTRMessage, 
    interchangeValidityStartDate: Date
): Institution | null {
    /* Since the use of this field was unclear to us, we asked GKV-Spitzenverband.
       
       They answered that this field marks whether an entry was added, changed, not changed or 
       deleted. Since the Kostenträger-file is always published as a complete directory (and not a 
       diff of sorts), they are of no relevance here, because we also produce a complete directory
       and not a diff.
       
       > Mit Hilfe des Verarbeitungskennzeichens kann ein Nutzer erkennen, ob und wenn ja, welche 
       > Art von Veränderung in der Kostenträgerdatei enthalten ist. Da die Kostenträgerdateien
       > immer als Gesamtverzeichnis aller IK und aller Datenannahmestellen je Kassenart 
       > bereitgestellt werden, liegt dem Nutzer aber unabhängig vom Verarbeitungskennzeichen aber
       > immer ein vollständiges Verzeichnis vor. 

       But to be on the same side, we will not include "03" in the parse result as it means 
       "this entry was deleted".
    */
    if (msg.fkt.verarbeitungskennzeichenSchluessel == "03") {
        return null
    }

    /* no need to include institutions that are not valid anymore when this kostenträger file
       becomes valid */
    const msgValidityStartDate = msg.vdt.validityFrom
    const msgValidityEndDate = msg.vdt.validityTo
    if (msgValidityEndDate && msgValidityEndDate < interchangeValidityStartDate) {
        return null
    }

    /* Simplification: Certain data is documented that it could be different, but de-facto it's not.
       Let's assert that it is never a value so that our data model and application logic can be 
       simpler
     */

    const messageTxt = `IK ${msg.idk.ik} – message ${msg.id} -`

    if (msg.idk.institutionsart != "99") {
        throw new Error(`${messageTxt} Expected that "institutionsart" is always 99`)
    }

    msg.dfuList.forEach((dfu) => {
        if (dfu.allowedTransmissionDays && dfu.allowedTransmissionDays != "1") {
            throw new Error(`${messageTxt} Expected that transmission is allowed on any day but was "${dfu.allowedTransmissionDays}"`)
        }
        // some health insurances specify "0000" as end time, means supposedly the same as "2400"
        if (dfu.allowedTransmissionTimeEnd == "0000") {
            dfu.allowedTransmissionTimeEnd = "2400"
        }
        if (
            dfu.allowedTransmissionTimeStart && dfu.allowedTransmissionTimeStart != "0000"
            || dfu.allowedTransmissionTimeEnd && dfu.allowedTransmissionTimeEnd != "2400"
        ) {
            const start = dfu.allowedTransmissionTimeStart
            const end = dfu.allowedTransmissionTimeEnd
            throw new Error(`${messageTxt} Expected that transmission is allowed at any time but was ${start}-${end}`)
        }

        if (dfu.benutzerkennung) {
            throw new Error(`${messageTxt} Expected that "benutzerkennung" is empty`)
        }
    })

    if (msg.uemList.length > 0) {
        const acceptsInternetOrPaperReceipts = msg.uemList.some((uem) => ["1","5","6"].includes(uem.uebermittlungsmediumSchluessel))
        if (!acceptsInternetOrPaperReceipts) {
            throw new Error(`${messageTxt} Expected that institution at least accepts either paper receipts or receipts sent over internet`)
        }
    }

    msg.vkgList.forEach((vkg) => {
        if (vkg.ikVerknuepfungsartSchluessel == "00") {
            throw new Error (`Expected that ikVerknuepfungsartSchluessel is never "00"`)
        }
    })

    const kostentraegerLinks = msg.vkgList
        .filter((vkg) => vkg.ikVerknuepfungsartSchluessel == "01")
        .map((vkg) => createInstitutionLink(vkg))

    const datenannahmestelleLinks = msg.vkgList
        .filter((vkg) => vkg.ikVerknuepfungsartSchluessel == "03")
        .map((vkg) => createInstitutionLink(vkg))
    
    const untrustedDatenannahmestelleLinks = msg.vkgList
        .filter((vkg) => vkg.ikVerknuepfungsartSchluessel == "02")
        .map((vkg) => createInstitutionLink(vkg))

    const papierannahmestelleLinks = createPapierannahmestelleLinks(msg.vkgList)

    const contacts = msg.aspList.map((asp) => createContact(asp))
    
    const certificates = certificatesByIK.get(msg.idk.ik) || null

    const transmissionEmail = msg.dfuList.find((dfu) => dfu.dfuProtokollSchluessel == "070")?.address || null
    const kim = msg.dfuList.find((dfu) => dfu.dfuProtokollSchluessel == "080")?.address || null
    return {
        ik: msg.idk.ik,
        name: msg.nam.names.join(" "),
        abbreviatedName: msg.idk.abbreviatedName,
        
        vertragskassennummer: msg.idk.vertragskassennummer || null,

        validityFrom: msgValidityStartDate > interchangeValidityStartDate ? msgValidityStartDate : null,
        validityTo: msgValidityEndDate || null,

        contacts: contacts.length > 0 ? contacts : null,
        addresses: msg.ansList.map((ans) => createAddress(ans)),
        transmissionEmail,
        certificates,
        kim,
        kostentraegerLinks: kostentraegerLinks.length > 0 ? kostentraegerLinks : null,
        datenannahmestelleLinks: datenannahmestelleLinks.length > 0 ? datenannahmestelleLinks : null,
        untrustedDatenannahmestelleLinks: untrustedDatenannahmestelleLinks.length > 0 ? untrustedDatenannahmestelleLinks : null,
        papierannahmestelleLinks: papierannahmestelleLinks.length > 0 ? papierannahmestelleLinks : null
    }
}

/** Due to the limitations of the EDIFACT format, a link to a Papierannahmestelle that accepts 
 *  any paper may result in 2 - 6 links. Let's merge them here as well... */
function createPapierannahmestelleLinks(vkgs: VKG[]): InstitutionLink[] {
    const result: InstitutionLink[] = []
    vkgs.forEach((vkg) => {
        if (vkg.ikVerknuepfungsartSchluessel == "09") {
            const institutionLink = createInstitutionLink(vkg)

            const existingInstitutionLink = result.find(link => isInstitutionLinkEqual(link, institutionLink))

            if (existingInstitutionLink) {
                existingInstitutionLink.transmissionTypes.push(...institutionLink.transmissionTypes)
            } else {
                result.push(institutionLink)
            }
        }
    })
    return result
}

function isInstitutionLinkEqual(a: InstitutionLink, b: InstitutionLink): boolean {
    return a.ik == b.ik && 
           a.location == b.location && 
           a.sgbvAbrechnungscode == b.sgbvAbrechnungscode && 
           a.sgbxiLeistungsart == b.sgbxiLeistungsart
}

function createInstitutionLink(vkg: VKG): InstitutionLink {
    if (vkg.abrechnungsstelleIK) {
        throw new Error(`Expected that abrechnungsstelleIK is never set, but was "${vkg.abrechnungsstelleIK}"`)
    }

    let kvLocationSchluessel: KVLocationSchluessel | undefined

    const bundesland = vkg.standortLeistungserbringerBundeslandSchluessel
    const bezirk = vkg.standortLeistungserbringerKVBezirkSchluessel
    if (bezirk) {
        kvLocationSchluessel = kvBezirkSchluesselToKVLocation.get(bezirk)
        if (!kvLocationSchluessel) {
            throw new Error(`Unexpected value "${bezirk}" for standortLeistungserbringerKVBezirkSchluessel `)
        }
    } else if (bundesland == "99") {
        kvLocationSchluessel = undefined
    } else if (bundesland) {
        kvLocationSchluessel = bundeslandSchluesselToKVLocation.get(bundesland)
        if (!kvLocationSchluessel) {
            throw new Error(`Unexpected value "${bundesland}" for standortLeistungserbringerBundeslandSchluessel`)
        }
    } else {
        kvLocationSchluessel = undefined
    }

    if (vkg.tarifkennzeichen) {
        throw new Error(`Expected that tarifkennzeichen is never set, but was "${vkg.tarifkennzeichen}"`)
    }

    const transmissionTypes = vkg.datenlieferungsartSchluessel
        ? [vkg.datenlieferungsartSchluessel]
        : []
    
    const leGruppeSchluessel = vkg.leistungserbringergruppeSchluessel
    let sgbvAbrechnungscode: KostentraegerSGBVAbrechnungscodeSchluessel | null = null
    let sgbxiLeistungsart: KostentraegerSGBXILeistungsartSchluessel | null = null
    if (leGruppeSchluessel == "5") {
        const schluessel = vkg.sgbvAbrechnungscodeSchluessel || null
        sgbvAbrechnungscode = schluessel ?? "00"
    } else if (leGruppeSchluessel == "6") {
        const schluessel = vkg.sgbxiLeistungsartSchluessel || null
        sgbxiLeistungsart = schluessel ?? "00"
    }

    return {
        ik: vkg.verknuepfungspartnerIK,
        location: kvLocationSchluessel || null,
        transmissionTypes,
        sgbvAbrechnungscode,
        sgbxiLeistungsart
    }
}

function createContact(asp: ASP): Contact {
    return {
        phone: asp.phone || null,
        fax: asp.fax || null,
        name: asp.name || null,
        fieldOfWork: asp.fieldOfWork || null
    }
}

function createAddress(ans: ANS): Address {
    const { place, postcode, address } = ans

    switch(ans.anschriftartSchluessel) {
        case "1": return { place, postcode, streetAndHousenumber: address }
        case "2": return { place, postcode, poBox: address }
        case "3": return { place, postcode }
    }
}
