/**
 * dates.js – Hilfsfunktionen für Tage
 * ---------------------------------------------------------------------------
 * Jeder Eintrag gehört zu einem TAG, nicht zu einem Zeitpunkt.
 * Deshalb speichern wir das Datum als Text im Format "JJJJ-MM-TT"
 * (z. B. "2026-11-21") – immer in deiner lokalen Zeit.
 *
 * Warum nicht date.toISOString()? Das rechnet in UTC um. Um 00:30 Uhr in
 * Wien wäre das noch der Vortag – dein Mitternachtssnack landete dann
 * am falschen Tag.
 */

/**
 * Macht aus einem Date-Objekt den Tages-Schlüssel "JJJJ-MM-TT" (lokale Zeit).
 *
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function toDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Monate zählen ab 0!
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Macht aus "JJJJ-MM-TT" wieder ein Date-Objekt (12:00 Uhr lokale Zeit).
 * Mittag statt Mitternacht, damit Sommer-/Winterzeit nie den Tag verschiebt.
 *
 * @param {string} key
 * @returns {Date}
 */
export function fromDateKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) throw new RangeError(`Ungültiger Tages-Schlüssel: ${key}`);
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d, 12);
  // fängt Unsinn wie "2026-02-31" ab (würde sonst zum 3. März)
  if (date.getMonth() !== m - 1) throw new RangeError(`Ungültiges Datum: ${key}`);
  return date;
}

/**
 * Verschiebt einen Tages-Schlüssel um n Tage (n darf negativ sein).
 *
 * @param {string} key "JJJJ-MM-TT"
 * @param {number} days
 * @returns {string}
 */
export function addDays(key, days) {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}
