import fetch from 'cross-fetch'
import tokenize from "../edifact/tokenizer"
import parse from "./edifact/parser"
import transform from "./transformer"
import { InstitutionList, InstitutionListParseResult } from "./types"

const kostentraegerRssUrls = [
    "https://gkv-datenaustausch.de/leistungserbringer/pflege/kostentraegerdateien_pflege/rss_kostentraegerdateien_pflege.xml",
    "https://gkv-datenaustausch.de/leistungserbringer/sonstige_leistungserbringer/kostentraegerdateien_sle/rss_kostentraegerdateien_sonstige_leistungserbringer.xml"
]

export default async function fetchKostentraeger(): Promise<InstitutionList[]> {
    const fileUrls = await fetchKostentraegerUrls(kostentraegerRssUrls)
    const institutionLists = await fetchKostentraegerFiles(fileUrls)
    return institutionLists
}

async function fetchKostentraegerUrls(kostentraegerRssUrls: string[]): Promise<string[]> {
    const urlsArray = await Promise.all(kostentraegerRssUrls.map(async (url) => {
        const responseText = await (await fetch(url)).text()
        const rssDOM = new DOMParser().parseFromString(responseText, "text/xml")
        const items = rssDOM.getElementsByTagName("item")
        const urls: string[] = []
        for (let i = 0; i < items.length; i++) {
            const item = items.item(i)
            const kostentraegerFileUrl = item?.getElementsByTagName("link")?.item(0)?.childNodes[0]?.nodeValue
            if (kostentraegerFileUrl) {
                urls.push(kostentraegerFileUrl)
            }
        }
        return urls
    }))
    return urlsArray.flat()
}

async function fetchKostentraegerFiles(kostentraegerFileUrls: string[]): Promise<InstitutionList[]> {
    return await Promise.all(kostentraegerFileUrls.map(async (url) => await fetchKostentraegerFile(url)))
}

async function fetchKostentraegerFile(url: string): Promise<InstitutionList> {
    const response = await fetch(url)
    /* Kostenträger files are encoded in iso-8859-1 and not in UTF-8, so we cannot
       just call response.text()! */
    // TODO but TextDecoder is not available in JSDOM test environment!
    //const decoder = new TextDecoder("iso-8859-1")
    //const text = decoder.decode(await response.arrayBuffer())

    const text = await response.text()

    const fileName = url.substring(url.lastIndexOf("/")+1)
    try {
        return parseKostentraegerString(fileName, text)
    } catch(e) {
        e.message = fileName + ": " + e.message
        throw e
    }
}

function parseKostentraegerString(filename: string, text: string) {
    const tokenizedEdifact = tokenize(text)
    const edifactParseResult = parse(tokenizedEdifact)
    const transformedResult = transform(edifactParseResult.interchange)
    console.log(
        filename + "\n    " + 
        edifactParseResult.warnings.join("\n    ") + "\n    " +
        transformedResult.warnings.join("\n    ")
    )
    return transformedResult.institutionList
}