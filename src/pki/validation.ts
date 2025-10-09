import { initCrypto } from "./crypto";
import { bufferToCertificate } from "./utils";
import { ValidationError } from "../validation/index";
import { error, warning } from "../validation/utils";

/**
 * @param obj 
 * @param property 
 * @param issuerCertificateBinary
 * certificate can only be verified with the issuerCertificateBinary parameter, 
 * otherwise the verification is skipped
 * @returns 
 */
export const isValidCertificate = async <T>(
    obj: T, 
    property: keyof T, 
    issuerCertificateBinary?: ArrayBuffer
): Promise<ValidationError[]> => {
    const certificateBinary = obj[property] as unknown as Uint8Array;
    let notAfter: Date | undefined = undefined;
    let notBefore: Date | undefined = undefined;
    let verified = false;
    const results: ValidationError[] = [];
    const now = Date.now();
    const nearExpirationDate = new Date();
    nearExpirationDate.setDate(nearExpirationDate.getDate() + 30);

    if (certificateBinary?.constructor != ArrayBuffer && certificateBinary?.constructor != Uint8Array) {
        return [error("unexpectedType", property, { expectedType: "ArrayBuffer or Uint8Array"})];
    }

    try {
        initCrypto();
        const certificate = bufferToCertificate(certificateBinary);
        notAfter = certificate.notAfter.type == 0
            ? certificate.notAfter.value
            : undefined;
        notBefore = certificate.notBefore.type == 0
            ? certificate.notBefore.value
            : undefined;

        if (issuerCertificateBinary) {
            const issuerCertificate = bufferToCertificate(issuerCertificateBinary);
            verified = await certificate.verify(issuerCertificate);
        } else {
            verified = true;
        }
    } catch (err) {
        return [error("throwsError", property, undefined, "" + err)];
    }

    if (!verified) {
        results.push(error("certificateVerificationFailed", property))
    }

    if (!notAfter || notAfter.getTime() < now) {
        results.push(error("certificateExpired", property))
    }

    if (!notBefore || now < notBefore.getTime()) {
        results.push(error("certificateBeforeValidity", property))
    }

    if (!!notAfter && now < notAfter.getTime() && notAfter.getTime() <= nearExpirationDate.getTime()) {
        results.push(warning("certificateWillExpire", property, { expirationDate: notAfter.toISOString() }));
    }

    return results;
};
