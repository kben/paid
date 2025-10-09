import { BillingData, Address, Ansprechpartner, Institution, InvoicesWithRecipient, Recipient, Versicherter } from "./types"
import { Institution as KostentraegerInstitution } from "./kostentraeger/types"
import { 
    arrayConstraints, valueConstraints,
    isArray, isChar, isVarchar, isDate, isIK, isInt, isRequired,
    isOptionalChar, isOptionalVarchar,
    error, isTruncatedIfTooLong, isRechnungsnummer, isOptionalInt,
} from "./validation/utils"
import { isValidCertificate } from "./pki/validation"
import { Invoice, Leistungserbringer } from "./sgb-xi/types"
import { ValidationResult } from "./validation/index"
import { IncrementalNumberMinLength } from "./utils"


export const constraintsIKToDatenaustauschreferenz = (record: Record<string, string>) => 
    Object.keys(record).flatMap(ik => [
        // this is a requirement for a key, not a value: Each key must be an IK
        /\d{9}/.test(ik) ? undefined : error("institutionskennzeichenIncorrect", ik),
        // and each value must be a number from 1 to 9999
        isInt(record, ik, 1, 1e5)
    ])

export const constraintsIKToLfdDatenannahmeimJahr = (r: Record<string, string>) => 
    Object.keys(r).flatMap(ik => [
        // this is a requirement for a key, not a value: Each key must be an IK
        /\d{9}/.test(ik) ? undefined : error("institutionskennzeichenIncorrect", ik),
        // and each value must be a number from 1 to 99
        isInt(r, ik, 1, 100)
    ])

export const constraintsInstitution = (institution: Institution) => [
    isTruncatedIfTooLong(isVarchar(institution, "name", 30)),
    isIK(institution, "ik"),
    isTruncatedIfTooLong(isArray(institution, "ansprechpartner", 0, 3)),
    ...arrayConstraints(institution, "ansprechpartner", constraintsAnsprechpartner),
    isTruncatedIfTooLong(isVarchar(institution, "email", 70))
]

const constraintsAnsprechpartner = (ansprechpartner: Ansprechpartner, index: number, list: Ansprechpartner[]) => {
    const phoneNumberLength = ansprechpartner.phone ? ansprechpartner.phone?.length : 0
    return [
        isVarchar(ansprechpartner, "name", 30),
        isOptionalVarchar(ansprechpartner, "phone", 30),
        /* how much space there is left for the name depends on the length of the phone number, if any, 
           and the number of free remaining ansprechpartner slots (max. 4)*/
        list.length >= 4 - index
            ? isTruncatedIfTooLong(isVarchar(ansprechpartner, "name", 30 - phoneNumberLength - 2))
            : undefined
    ]
}

export const constraintsVersicherter = (versicherter: Versicherter, requiresVersichertenStatus: boolean) => [
    isTruncatedIfTooLong(isVarchar(versicherter, "firstName", 30)), // 45 for SGB XI 
    isTruncatedIfTooLong(isVarchar(versicherter, "lastName", 45)), // 47 for SGB V
    isDate(versicherter, "birthday"),
    isIK(versicherter, "krankenkasseIK"),
    /* versichertennummer is either required or if not specified, address is required */
    ...(!versicherter.versichertennummer
        ? [
            // the visible immutable part of versichertennummer is always 10 characters long
            isChar(versicherter, "versichertennummer", 10),
            isRequired(versicherter, "address"),
            ...valueConstraints<Address>(versicherter, "address", constraintsWhenAddressIsMandatory),
        ] 
        : [
            // the visible immutable part of versichertennummer is always 10 characters long
            isOptionalChar(versicherter, "versichertennummer", 10),
        ]
    ),
    // no constraints for optional versichertenstatus (should be (up to) 5 digits though)
    /* for SGB V versichertenstatus is either required or if not specified, address is required */
    ...(requiresVersichertenStatus && !versicherter.versichertenstatus
        ? [
            isRequired(versicherter, "versichertenstatus"),
            isRequired(versicherter, "address"),
            ...valueConstraints<Address>(versicherter, "address", constraintsWhenAddressIsMandatory),
        ]
        : []
    ),
    // if address is optionally specified, the fields in address must just be not too long
    ...valueConstraints<Address>(versicherter, "address", constraintsAddress),
]

const constraintsWhenAddressIsMandatory = (address: Address) => [
    isRequired(address, "street"),
    isRequired(address, "houseNumber"),
    isRequired(address, "postalCode"),
    isRequired(address, "city")
]

const constraintsAddress = (address: Address) => [
    isTruncatedIfTooLong(isOptionalVarchar(address, "street", 24)), // street + housenumber is max 30, 46 for SGB XI
    isTruncatedIfTooLong(isOptionalVarchar(address, "houseNumber", 5)), // 9 for SGB XI
    isTruncatedIfTooLong(isOptionalVarchar(address, "postalCode", 7)), // 10 for SGB XI
    isTruncatedIfTooLong(isOptionalVarchar(address, "city", 25)), // 40 for SGB XI
    /* SGB XI in general allows for longer address strings, but when both are used, I guess a 
       warning should be emitted when the string is too long for any SGB ...*/
]

export const constraintsRecipient = (recipient: Recipient) => [
    isChar(recipient, "kassenart", 2),
    isRequired(recipient, "sendTo"),
    ...valueConstraints<KostentraegerInstitution>(recipient, "sendTo", sendTo => [
        isIK(sendTo, "ik"),
        isVarchar(sendTo, "transmissionEmail", 254),
    ]),
    isRequired(recipient, "encryptTo"),
    ...valueConstraints<KostentraegerInstitution>(recipient, "encryptTo", encryptTo => [
        isIK(encryptTo, "ik"),
        isRequired(recipient, "certificate"),
    ]),
];

export const constraintsBillingData = (billing: BillingData) => [
    isRequired(billing, "datenaustauschreferenzJeEmpfaengerIK"),
    ...valueConstraints(billing, "datenaustauschreferenzJeEmpfaengerIK", constraintsIKToDatenaustauschreferenz),
    isRequired(billing, "testIndicator"),
    isRequired(billing, "rechnungsart"),
    isOptionalVarchar(billing, "rechnungsnummerprefix", 14 - IncrementalNumberMinLength + 1, 0),
    ...valueConstraints(billing, "rechnungsnummerprefix", (value?: string) => [isRechnungsnummer(value)]),
    isOptionalVarchar(billing, "belegnummerprefix", 10 - IncrementalNumberMinLength, 0),
    ...valueConstraints(billing, "belegnummerprefix", (value?: string) => [isRechnungsnummer(value)]),
    isInt(billing, "nextRechnungsnummer", 0, Math.pow(10, Math.max(14 - (billing.rechnungsnummerprefix?.length || 0), IncrementalNumberMinLength - 1))),
    isInt(billing, "nextBelegnummer", 0, Math.pow(10, Math.max(10 - (billing.belegnummerprefix?.length || 0), IncrementalNumberMinLength))),
    isRequired(billing, "senderCertificate"),
    isRequired(billing, "senderPrivateKey"),
    isOptionalInt(billing, "korrekturlieferung", 0, 10),
    billing.rechnungsart != "1" ? isRequired(billing, "abrechnungsstelle") : undefined,
    ...valueConstraints(billing, "abrechnungsstelle", constraintsInstitution),
    isRequired(billing, "laufendeDatenannahmeImJahrJeEmpfaengerIK"),
    ...valueConstraints(billing, "laufendeDatenannahmeImJahrJeEmpfaengerIK", constraintsIKToLfdDatenannahmeimJahr),
]

export const constraintsForTransmission = async (
    billingData: BillingData,
    invoicesWithRecipient: InvoicesWithRecipient,
    constraintsInvoice: (invoice: Invoice) => ValidationResult[]
) => {
    const recipientCertificateResult = await isValidCertificate(invoicesWithRecipient.recipient, "certificate");
    const senderCertificateResult = await isValidCertificate(billingData, "senderCertificate");

    return [
        ...valueConstraints<BillingData>({ billingData }, "billingData", billingData => [
            ...constraintsBillingData(billingData),
            ...senderCertificateResult
        ]),
        ...valueConstraints<InvoicesWithRecipient>({ invoicesWithRecipient }, "invoicesWithRecipient", invoicesWithRecipient => [
            isArray(invoicesWithRecipient, "invoices", 1),
            ...arrayConstraints<Invoice>(invoicesWithRecipient, "invoices", constraintsInvoice),
            ...valueConstraints<Recipient>(invoicesWithRecipient, "recipient", recipient => [
                ...constraintsRecipient(recipient),
                ...recipientCertificateResult,
            ])
        ]),
    ];
};

export const constraintsLeistungserbringer = (leistungserbringer: Leistungserbringer) => [
    ...constraintsInstitution(leistungserbringer),
    isRequired(leistungserbringer, "postalAddress"),
    ...valueConstraints<Leistungserbringer["postalAddress"]>(leistungserbringer, "postalAddress", constraintsPostalAddress),
    isRequired(leistungserbringer, "abrechnungscode"),
    isRequired(leistungserbringer, "tarifbereich"),
    isRequired(leistungserbringer, "location"),
    leistungserbringer.umsatzsteuerBefreiung != "01" 
        ? isVarchar(leistungserbringer, "umsatzsteuerOrdnungsnummer", 20) 
        : undefined,
];

const constraintsPostalAddress = (address: Leistungserbringer["postalAddress"]) => [
    isVarchar(address, "street1"),
    isVarchar(address, "postalCode"),
    isVarchar(address, "city"),
];
