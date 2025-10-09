/** based on document Gemeinsame Grundsätze Technik, Anlage 7
 * (see /docs/documents.md for more info)
 */

import { datetime } from "../formatter";
import { File, Email, Institution } from "../types";

export const billingEmail = (
    sender: Institution,
    recipientEmailAddress: string,
    payloadFile: File,
    instructionFile: File,
): Email => ({
    from: {
        name: sender.ik,
        address: sender.email
    },
    to: [{ address: recipientEmailAddress, name: "" }],
    date: formattedDateForEmail(),
    subject: sender.ik,
    body: [
        [instructionFile.name, instructionFile.bytes.byteLength, fileDate()].join(", "),
        [payloadFile.name, payloadFile.bytes.byteLength, fileDate()].join(", "),
        sender.name,
        sender.ansprechpartner[0]?.name ? "Ansprechpartner: " + sender.ansprechpartner[0]?.name : undefined,
        sender.email ? "E-Mail: " + sender.email : sender.email,
        sender.ansprechpartner[0]?.phone ? "Telefon: " + sender.ansprechpartner[0]?.phone : undefined,
    ].filter(Boolean).join("\r\n") + "\r\n",
    attachments: [payloadFile, instructionFile]
});

export const formattedDateForEmail = (date = new Date()) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hour = date.getHours().toString().padStart(2, "0");
    const minute = date.getMinutes().toString().padStart(2, "0");

    return `${day}.${month}.${year} ${hour}:${minute}`;
};

const fileDate = (value = new Date()) => 
    datetime(value) + value.getSeconds().toString().padStart(2, "0");