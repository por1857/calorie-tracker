/**
 * models.js – wie unsere Daten aussehen und wie sie entstehen
 * ---------------------------------------------------------------------------
 * Hier werden Lebensmittel, Einträge und Ziele ERZEUGT und GEPRÜFT.
 * Gespeichert wird woanders (js/storage/). So bleibt die Form der Daten
 * gleich, egal ob sie im iPhone (IndexedDB) oder später in der Cloud liegen.
 *
 * Schon vorbereitet für mehrere Benutzer:
 *  - id         weltweit eindeutige UUID → passt später direkt in die Cloud
 *  - createdBy  wer ein Lebensmittel angelegt hat (Lebensmittel sind geteilt)
 *  - userId     wem ein Eintrag gehört (Einträge und Ziele sind privat)
 *  - updatedAt  wann zuletzt geändert → nötig für den Abgleich mit der Cloud
 *  - deletedAt  "weich" gelöscht: der Datensatz bleibt mit Löschvermerk
 *               liegen, damit auch andere Geräte vom Löschen erfahren
 *
 * Solange es keine Cloud gibt, sind createdBy und userId einfach null.
 *
 * Zeitpunkte (createdAt, updatedAt, deletedAt) speichern wir als ISO-Text
 * in UTC, z. B. "2026-11-21T14:05:00.000Z". Das ist für Zeitpunkte richtig.
 * Für den TAG eines Eintrags nehmen wir dagegen dayKey (siehe dates.js).
 */

import { parseAmount, scaleNutrients } from './calc.js';

// ---- Feste Werte ------------------------------------------------------------

/** Mahlzeiten in Anzeigereihenfolge. id = gespeichert, label = angezeigt. */
export const MEALS = Object.freeze([
  Object.freeze({ id: 'breakfast', label: 'Frühstück' }),
  Object.freeze({ id: 'lunch', label: 'Mittagessen' }),
  Object.freeze({ id: 'dinner', label: 'Abendessen' }),
  Object.freeze({ id: 'snack', label: 'Snacks' }),
]);

export const MEAL_IDS = Object.freeze(MEALS.map((m) => m.id));

/** Standard-Tagesziele, bis man eigene einstellt. */
export const DEFAULT_GOALS = Object.freeze({ kcal: 2000, protein: 150, carbs: 220, fat: 70 });

export const NAME_MAX_LENGTH = 80;

const MACRO_KEYS = ['protein', 'carbs', 'fat'];

// ---- Hilfsfunktionen --------------------------------------------------------

/** Aktueller Zeitpunkt als ISO-Text. In Tests wird eine feste Uhr übergeben. */
export const systemClock = () => new Date().toISOString();

/**
 * Erzeugt eine zufällige UUID, z. B. "3b241101-e2bb-4255-8caf-4136c566a962".
 * crypto.randomUUID() gibt es im Browser nur über HTTPS oder localhost.
 * Wenn du die App per WLAN-Adresse (http://192.168…) am iPhone testest,
 * fehlt die Funktion – dann bauen wir die UUID selbst aus Zufallszahlen.
 */
export function newId() {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();

  const bytes = c.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variante
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Ist ein Datensatz noch aktiv (nicht gelöscht)? */
export function isActive(record) {
  return !record?.deletedAt;
}

/** Markiert einen Datensatz als gelöscht (gibt eine Kopie zurück). */
export function markDeleted(record, { now = systemClock } = {}) {
  const time = now();
  return { ...record, deletedAt: time, updatedAt: time };
}

// ---- Prüfen von Eingaben ------------------------------------------------------

const MSG = Object.freeze({
  nameMissing: 'Gib einen Namen ein.',
  nameTooLong: `Höchstens ${NAME_MAX_LENGTH} Zeichen.`,
  number: 'Gib eine Zahl ein, zum Beispiel 372.',
  gramsPositive: 'Gib eine Menge über 0 ein, zum Beispiel 80.',
  kcalTooHigh: 'Mehr als 900 kcal pro 100 g gibt es nicht. Prüfe die Zahl.',
  macrosTooHigh: 'Protein, Kohlenhydrate und Fett ergeben zusammen mehr als 100 g. Prüfe die Werte.',
});

/**
 * Prüft die Eingaben des Formulars "Lebensmittel anlegen".
 * Leere Makro-Felder zählen als 0, Kalorien sind Pflicht.
 *
 * @param {{name?:string, kcal?:string, protein?:string, carbs?:string, fat?:string, defaultGrams?:string}} input
 * @returns {{ok:boolean, value?:object, errors:Object<string,string>}}
 *   errors: Feldname → Meldung; "form" für Fehler, die mehrere Felder betreffen
 */
export function validateFoodInput(input = {}) {
  const errors = {};

  const name = String(input.name ?? '').trim().replace(/\s+/g, ' ');
  if (!name) errors.name = MSG.nameMissing;
  else if (name.length > NAME_MAX_LENGTH) errors.name = MSG.nameTooLong;

  const kcal = parseAmount(input.kcal ?? '');
  if (Number.isNaN(kcal)) errors.kcal = MSG.number;
  else if (kcal > 900) errors.kcal = MSG.kcalTooHigh;

  const macros = {};
  for (const key of MACRO_KEYS) {
    const raw = String(input[key] ?? '').trim();
    macros[key] = raw === '' ? 0 : parseAmount(raw);
    if (Number.isNaN(macros[key])) errors[key] = MSG.number;
  }

  const macroSum = macros.protein + macros.carbs + macros.fat;
  if (!Number.isNaN(macroSum) && macroSum > 100) errors.form = MSG.macrosTooHigh;

  let defaultGrams = null;
  const rawGrams = String(input.defaultGrams ?? '').trim();
  if (rawGrams !== '') {
    defaultGrams = parseAmount(rawGrams);
    if (Number.isNaN(defaultGrams) || defaultGrams <= 0) errors.defaultGrams = MSG.gramsPositive;
  }

  const ok = Object.keys(errors).length === 0;
  return ok
    ? { ok, errors, value: { name, per100g: { kcal, ...macros }, defaultGrams } }
    : { ok, errors };
}

/**
 * Prüft eine Mengenangabe in Gramm (muss größer als 0 sein).
 * @returns {{ok:boolean, value?:number, error?:string}}
 */
export function validateGrams(input) {
  const grams = parseAmount(input);
  if (Number.isNaN(grams) || grams <= 0) return { ok: false, error: MSG.gramsPositive };
  return { ok: true, value: grams };
}

// ---- Erzeugen ---------------------------------------------------------------

/**
 * Neues Lebensmittel (geteilt – später für alle Freunde sichtbar).
 *
 * @param {{name:string, per100g:object, defaultGrams?:number|null}} value  aus validateFoodInput
 * @param {{userId?:string|null, now?:Function}} [options]
 */
export function createFood(value, { userId = null, now = systemClock } = {}) {
  const time = now();
  return {
    id: newId(),
    name: value.name,
    per100g: { kcal: 0, protein: 0, carbs: 0, fat: 0, ...value.per100g },
    defaultGrams: value.defaultGrams ?? null,
    createdBy: userId,
    createdAt: time,
    updatedAt: time,
    deletedAt: null,
  };
}

/** Ändert ein Lebensmittel. id, createdBy und createdAt bleiben gleich. */
export function updateFood(food, changes, { now = systemClock } = {}) {
  return {
    ...food,
    ...changes,
    per100g: { ...food.per100g, ...changes.per100g },
    id: food.id,
    createdBy: food.createdBy,
    createdAt: food.createdAt,
    updatedAt: now(),
  };
}

/**
 * Neuer Eintrag aus einem Lebensmittel und einer Menge.
 * Name und Nährwerte werden KOPIERT: Ändert jemand später das Lebensmittel,
 * bleiben deine alten Tage unverändert.
 */
export function createEntryFromFood(food, grams, { meal, dayKey, userId = null, now = systemClock }) {
  assertMeal(meal);
  const time = now();
  return {
    id: newId(),
    userId,
    dayKey,
    meal,
    foodId: food.id,
    name: food.name,
    grams,
    ...scaleNutrients(food.per100g, grams),
    createdAt: time,
    updatedAt: time,
    deletedAt: null,
  };
}

/** Schnelleintrag: nur Nährwerte, ohne Lebensmittel und ohne Gramm. */
export function createQuickEntry(nutrients, { meal, dayKey, name = 'Schnelleintrag', userId = null, now = systemClock }) {
  assertMeal(meal);
  const time = now();
  return {
    id: newId(),
    userId,
    dayKey,
    meal,
    foodId: null,
    name,
    grams: null,
    kcal: nutrients.kcal ?? 0,
    protein: nutrients.protein ?? 0,
    carbs: nutrients.carbs ?? 0,
    fat: nutrients.fat ?? 0,
    createdAt: time,
    updatedAt: time,
    deletedAt: null,
  };
}

/** Tagesziele (privat, ein Datensatz pro Benutzer). */
export function createGoals(values = DEFAULT_GOALS, { userId = null, now = systemClock } = {}) {
  return {
    id: 'goals',
    userId,
    kcal: values.kcal,
    protein: values.protein,
    carbs: values.carbs,
    fat: values.fat,
    updatedAt: now(),
  };
}

function assertMeal(meal) {
  if (!MEAL_IDS.includes(meal)) throw new RangeError(`Unbekannte Mahlzeit: ${meal}`);
}
