/** based on documents: 
 *  - Pflege, Technische Anlage 1, Anhang 5: Kostenträgerdatei
 *  - Sonstige Leistungserbringer, Anlage 1, Anhang 3, Kapitel 10: Kostenträgerdatei
 * 
 * (see /docs/documents.md for more info)
 */

/** Indicates the group of statutory health insurance. Each group has its own set of contact 
 *  addresses and rules how and where to send the invoices.
*/
export const kassenartSchluessel = {
    "AO": "AOK", // Allgemeine Ortskrankenkassen
    "EK": "Ersatzkassen", // Verband der Ersatzkassen (vdek), u.a. TK
    "BK": "Betriebskrankenkassen (BKK)",
    "IK": "Innungskrankenkassen (IKK)",
    "BN": "Knappschaft-Bahn-See", // Knappschaft, KBS
    "LK": "Landwirtschaftliche Krankenkassen (SVLFG)", 
    // "GK": "Gesetzliche Krankenversicherung"
}

export type KassenartSchluessel = keyof typeof kassenartSchluessel

/** Indicates the group of statutory health insurance with their abbreviated names.
*/
export const kassenartShortSchluessel = {
    "AO": "AOK",
    "EK": "vdek",
    "BK": "BKK",
    "IK": "IKK",
    "BN": "KBS",
    "LK": "SVLFG",
}

export type KassenartShortSchluessel = keyof typeof kassenartShortSchluessel


/** For a "Kostenträger" file, indicates for which health care provider this file is used - 
 * 
 *  For services of care providers according to § 105 SGB XI, it is 
 *  "Datenaustausch Teilprojekt Leistungserbringer Pflege"
 * 
 *  For services of care providers according to § 302 SGB V, it is
 *  "Datenaustausch Teilprojekt Sonstige Leistungserbringer"
  */
export const verfahrenSchluessel = {
    "01": "Datenaustausch Teilprojekt Ärzte",
    "02": "Datenaustausch Teilprojekt Zahnärzte",
    "03": "Datenaustausch Teilprojekt Apotheken",
    "4A": "Datenaustausch Teilprojekt Krankenhäuser",
    "4B": "Datenaustausch Teilprojekt Reha-Einrichtungen",
    "05": "Datenaustausch Teilprojekt Sonstige Leistungserbringer",
    "06": "Datenaustausch Teilprojekt Leistungserbringer Pflege"
}

export type VerfahrenSchluessel = keyof typeof verfahrenSchluessel
