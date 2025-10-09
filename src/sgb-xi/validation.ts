import { duration } from "../formatter"
import { Pflegegrad, Versicherter } from "../types"
import {
    constraintsLeistungserbringer,
    constraintsVersicherter
} from "../validation"
import { 
    arrayConstraints, valueConstraints, isTruncatedIfTooLong, 
    isArray, isDate, isNumber, isVarchar, isRequired, 
    isOptionalDate, isOptionalInt, isOptionalNumber, isOptionalVarchar,
    isInt,
    isChar,
    error,
} from "../validation/utils"
import { getLeistungsBeginn } from "./index"
import { 
    Leistung,
    Pflegehilfsmittel,
    Zuschlag,
    Einsatz,
    Abrechnungsfall,
    Leistungserbringer,
    Invoice,
} from "./types"

export const constraintsInvoice = (invoice: Invoice) => [
    isRequired(invoice, "leistungserbringer"),
    ...valueConstraints<Leistungserbringer>(invoice, "leistungserbringer", constraintsLeistungserbringer),
    isOptionalVarchar(invoice, "rechnungsnummer", 14),
    isOptionalDate(invoice, "rechnungsdatum"),
    isArray(invoice, "faelle", 1),
    ...arrayConstraints<Abrechnungsfall>(invoice, "faelle", constraintsAbrechnungsfall)
]

const constraintsAbrechnungsfall = (fall: Abrechnungsfall) => [
    isRequired(fall, "versicherter"),
    ...valueConstraints<Versicherter>(fall, "versicherter", versicherter => constraintsVersicherter(versicherter, false)),
    ...valueConstraints<Versicherter>(fall, "versicherter", versicherter => 
        versicherter.krankenkasseIK.startsWith("18") ? [] : [error("institutionskennzeichenIncorrect", "krankenkasseIK", {hint: "should start with 18"})]
    ),
    isArray(fall.versicherter, "pflegegrad", 1),
    ...arrayConstraints<Pflegegrad>(fall.versicherter, "pflegegrad", constraintsPflegegrad),
    isVarchar(fall, "tarifkennzeichen", 3, 0),
    isOptionalVarchar(fall, "belegnummer", 10),
    isArray(fall, "einsaetze", 1),
    ...arrayConstraints(fall, "einsaetze", constraintsEinsatz),
    // ensure there are no einsaetze in time windows without pflegegrad (value == ""):
    ...fall.versicherter.pflegegrad
        .slice()
        .sort((a, b) => (a.since.getTime() ?? Number.NEGATIVE_INFINITY) - (b.since.getTime() ?? Number.NEGATIVE_INFINITY))
        .flatMap(({ since, value }, index, list) => value == ""
            ? [{ value, start: since.getTime(), end: list.at(index + 1)?.since.getTime() }]
            : []
        ).flatMap(({ start, end }) => 
            fall.einsaetze.find(einsatz => {
                const date = getLeistungsBeginn(einsatz)?.getTime();
                return !date || (start <= date && (!end || date < end));
            }) != undefined
                ? [error(
                    "einsaetzeWithoutPflegegrad", 
                    "einsaetze", 
                    {
                        start: new Date(start).toISOString(), 
                        end: end ? new Date(end).toISOString(): ""
                    }
                )]
                : []
        )
]

const constraintsPflegegrad = (pflegegrad: Pflegegrad) => [
    isRequired(pflegegrad, "since"),
    isDate(pflegegrad, "since"),
]

const constraintsEinsatz = (einsatz: Einsatz) => [
    isDate(einsatz, "leistungsBeginn"),
    isArray(einsatz, "leistungen", 1),
    ...arrayConstraints(einsatz, "leistungen", constraintsLeistung)
]

const constraintsLeistung = (leistung: Leistung) => [
    isRequired(leistung, "leistungsart"),
    isRequired(leistung, "verguetungsart"),
    isRequired(leistung, "qualifikationsabhaengigeVerguetung"),
    isNumber(leistung, "einzelpreis", 0, 1e10),
    isNumber(leistung, "anzahl", 0, 1e4),
    isOptionalNumber(leistung, "punktwert", 0, 10),
    isOptionalInt(leistung, "punktzahl", 0, 1e4),
    isOptionalInt(leistung, "beschaeftigtennummer1", 0, 1e9),
    isOptionalInt(leistung, "beschaeftigtennummer2", 0, 1e9),
    isArray(leistung, "zuschlaege", 0),
    ...arrayConstraints(leistung, "zuschlaege", constraintsZuschlag),
    ...constraintsLeistungByVerguetungsart(leistung)
]

const constraintsLeistungByVerguetungsart = (leistung: Leistung) => {
    switch(leistung.verguetungsart) {
        case "01": return [
            isVarchar(leistung, "leistungskomplex", 3)
        ]
        case "02": return [
            isDate(leistung, "leistungsBeginn"),
            isDate(leistung, "leistungsEnde"),
            isInt({ 
                duration: duration(leistung.leistungsBeginn!, leistung.leistungsEnde!, "minutes") 
            }, "duration", 1, 1e4),
            isRequired(leistung, "zeiteinheit"),
            isRequired(leistung, "zeitart")
        ]
        case "03": return [
            isDate(leistung, "leistungsEnde"),
            isRequired(leistung, "pflegesatz")
        ]
        case "04": return [
            isDate(leistung, "leistungsBeginn"),
            isDate(leistung, "leistungsEnde"),
            isRequired(leistung, "pflegesatz")
        ]
        case "05": return [
            isRequired(leistung, "hilfsmittel"),
            ...valueConstraints(leistung, "hilfsmittel", constraintsPflegehilfsmittel),
            isVarchar(leistung, "positionsnummer", 10)
        ]
        case "06": 
            if (leistung.wegegebuehren == "04") { 
                return [ isNumber(leistung, "gefahreneKilometer", 0, 1e4) ]
            } else {
                return []
            }
        case "07": return [
            isChar(leistung, "entlastungsleistung", 2),
        ]
        case "08": return [
            isChar(leistung, "beratungsbesuch", 1),
        ]
        case "99": return [
            isChar(leistung, "sonstigeLeistung", 2),
        ]
        default: return []
    }
}

const constraintsZuschlag = (zuschlag: Zuschlag) => [
    isRequired(zuschlag, "zuschlagsart"),
    isRequired(zuschlag, "zuschlag"),
    // the text is mandatory if zuschlag = 00
    isTruncatedIfTooLong(
        zuschlag.zuschlag == "00" ? 
        isVarchar(zuschlag, "beschreibungZuschlagsart", 50) :
        isOptionalVarchar(zuschlag, "beschreibungZuschlagsart", 50)
    ),
    isRequired(zuschlag, "zuschlagszuordnung"),
    isRequired(zuschlag, "zuschlagsberechnung"),
    isRequired(zuschlag, "istAbzugStattZuschlag"),
    isNumber(zuschlag, "wert", 0, 1e4)
]

const constraintsPflegehilfsmittel = (hilfsmittel: Pflegehilfsmittel) => [
    // mehrwertsteuerart is optional
    isOptionalNumber(hilfsmittel, "gesetzlicheZuzahlungBetrag", 0, 1e10),
    isOptionalVarchar(hilfsmittel, "genehmigungskennzeichen", 15),
    isOptionalDate(hilfsmittel, "genehmigungsDatum"),
    // kennzeichenPflegehilfsmittel is optional
    isTruncatedIfTooLong(isOptionalVarchar(hilfsmittel, "bezeichnungPflegehilfsmittel", 30)),
    isOptionalVarchar(hilfsmittel, "produktbesonderheitenPflegehilfsmittel", 10),
    isOptionalVarchar(hilfsmittel, "inventarnummerPflegehilfsmittel", 20)
]
