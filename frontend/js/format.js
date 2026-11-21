/**
 * format.js – Zahlen und Daten für die Anzeige aufbereiten
 * ---------------------------------------------------------------------------
 * Erst HIER wird gerundet. Sprache/Region: Österreich (de-AT),
 * also "1 240 kcal", "12,5 g" und "Jänner".
 */

import { fromDateKey } from './dates.js';

const LOCALE = 'de-AT';

const wholeNumber = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });
const longDay = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
const longDayWithYear = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});

/** Kalorien: immer ganze Zahlen. 1240.4 → "1 240" */
export function formatKcal(value) {
  return wholeNumber.format(Math.round(value)).replace(/^-0$/, '0');
}

/** Gramm: ganze Zahlen ab 10 g, darunter eine Nachkommastelle. 4.25 → "4,3" */
export function formatGrams(value) {
  const formatter = Math.abs(value) < 10 ? oneDecimal : wholeNumber;
  return formatter.format(value).replace(/^-0$/, '0');
}

/**
 * Überschrift für einen Tag.
 * Liefert z. B. { title: "Heute", subtitle: "Samstag, 21. November" }.
 *
 * @param {string} dayKey   angezeigter Tag "JJJJ-MM-TT"
 * @param {string} todayKey heutiger Tag "JJJJ-MM-TT"
 */
export function formatDayHeading(dayKey, todayKey) {
  const date = fromDateKey(dayKey);
  const sameYear = dayKey.slice(0, 4) === todayKey.slice(0, 4);
  const full = (sameYear ? longDay : longDayWithYear).format(date);

  const daysApart = Math.round((fromDateKey(dayKey) - fromDateKey(todayKey)) / 86_400_000);
  const relative = { 0: 'Heute', [-1]: 'Gestern', 1: 'Morgen' }[daysApart];

  return relative
    ? { title: relative, subtitle: full }
    : { title: full.split(',')[0], subtitle: full.split(', ')[1] ?? '' };
}
