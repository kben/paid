/** based on document: Pflege, Technische Anlage 1 für Abrechnung auf maschinell verwertbaren Datenträgern
  * see docs/documents.md for more info
  */

/* The documentation is vague on whether the decimal notation character (usually ",") should be 
   escaped or not, so we asked GKV-Spitzenverband.
   
   They answered that the decimal notation is NOT escaped:
   
   > Hier handelt es sich um eine Ungenauigkeit in der Technischen Anlage. Das Komma ist als 
   > Dezimalzeichen vorgesehen, aber nicht als Trennzeichen im Sinne der EDIFACT-Syntax. Somit ist
   > das Komma nicht zu maskieren. Zu maskieren sind nur die Zeichen Doppelpunkt, Plus und Apostroph.
*/
export const mask = (value: string | undefined | null) => value?.replace(/([:+?'])/g, "?$1") || "";

export const number = (value: number | undefined | null, fractionDigits?: number) => value?.toLocaleString("de-DE", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    useGrouping: false
}) || "";

export const price = (value: number | undefined | null) => number(value, 2);

/** Return only the day component of a date as a string formatted DD */
export const day = (value: Date) => value.getDate().toString().padStart(2, "0");

/** Return only the month component of a date as a string formatted MM (1 is January) */
export const month = (value: Date) => (value.getMonth() + 1).toString().padStart(2, "0");

/** Return the date as a string formatted JJJJMMDD */
export const date = (value: Date) => value.getFullYear() + month(value) + day(value);

/** Return only the time component of a date as a string formatted HHMM */
export const time = (value: Date) =>
    value.getHours().toString().padStart(2, "0") +
    value.getMinutes().toString().padStart(2, "0");

export const datetime = (value: Date) => date(value) + ":" + time(value);

export const toUTC = (date: Date) => {
    return new Date(
        Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            date.getHours(),
            date.getMinutes(),
            date.getSeconds()
        )
    );
}

/** Return duration between two given dates (order does not matter) in the given unit */
export const duration = (
    a: Date, 
    b: Date, 
    unit: "hours" | "minutes" | "seconds" | "milliseconds" = "milliseconds",
    round = Math.ceil
) => {
    // considering daylight saving time adjustments
    const milliseonds = Math.abs(toUTC(a).getTime() - toUTC(b).getTime());

    if (unit == "hours") {
        return round(milliseonds / 3600_000);
    } else if (unit == "minutes") {
        return round(milliseonds / 60_000);
    } else if (unit == "seconds") {
        return round(milliseonds / 1000);
    } else {
        return milliseonds;
    }
};

export const segment = (
    // undefined: value does not appear in segment
    // empty string: value appears as empty value in segment
    ...values: Array<string | undefined>
) => values.filter(value => value !== undefined).join("+").replace(/\+*$/, "") + "'\n";