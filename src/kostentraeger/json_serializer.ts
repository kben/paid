import { arrayBufferToBase64, base64ToArrayBuffer, bufferToCertificate, certificateToBuffer } from "../pki/utils";
import { InstitutionList } from "./types";
import { AsnSerializer, AsnParser } from "@peculiar/asn1-schema"
import { Certificate } from "@peculiar/asn1-x509"

export function serializeInstitutionLists(data: InstitutionList[], space?: string|number|undefined): string {
    return JSON.stringify(toPlainInstitutionLists(data), undefined, space)
}

export function deserializeInstitutionLists(text: string): InstitutionList[] {
    return toClassInstitutionLists(JSON.parse(text, (key: string, value: any): any => {
        switch(key) {
            case "validityStartDate": 
                return new Date(value as string)
        }
        return value
    }))
}

export function toPlainInstitutionLists(lists: InstitutionList[]) {
    return lists.map(list => ({
        ...list,
        institutions: list.institutions.map(institution => ({
            ...institution,
            certificates: institution.certificates?.map(certificate =>
                arrayBufferToBase64(AsnSerializer.serialize(certificate))
            )
        })),
        caCertificates: list.caCertificates.map(certificate =>
            arrayBufferToBase64(certificateToBuffer(certificate))
        )
    }));
}

export function toClassInstitutionLists(lists: ReturnType<typeof toPlainInstitutionLists>): InstitutionList[] {
    return lists.map(list => ({
        ...list,
        institutions: list.institutions.map(institution => ({
            ...institution,
            certificates: institution.certificates?.map(certificate =>
                AsnParser.parse(base64ToArrayBuffer(certificate), Certificate)
            ) || null
        })),
        caCertificates: list.caCertificates.map(certificate =>
            bufferToCertificate(base64ToArrayBuffer(certificate))
        )
    }));
}
