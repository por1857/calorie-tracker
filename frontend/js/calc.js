/**
 * calc.js – die Rechenlogik der App ("der Taschenrechner")
 * ---------------------------------------------------------------------------
 * Hier steht NUR Rechnen: kein HTML, kein Speichern, kein Datum.
 * Dadurch lässt sich alles mit Unit-Tests prüfen (siehe tests/calc.test.js).
 *
 * Grundregeln:
 *  - Nährwerte von Lebensmitteln werden immer PRO 100 g gespeichert.
 *  - Gerechnet wird mit ungerundeten Zahlen. Gerundet wird erst bei der
 *    Anzeige (siehe format.js). Sonst summieren sich Rundungsfehler.
 *
 * Ein "Nährwert-Objekt" sieht in der ganzen App so aus:
 *   { kcal: 120, protein: 3.5, carbs: 20, fat: 2.1 }
 */

/** Die vier Werte, die wir überall tracken – in fester Reihenfolge. */
export const NUTRIENT_KEYS = Object.freeze(['kcal', 'protein', 'carbs', 'fat']);

/** Energie pro Gramm Makronährstoff (Standardwerte). */
export const KCAL_PER_GRAM = Object.freeze({ protein: 4, carbs: 4, fat: 9 });

/** Ein Nährwert-Objekt, in dem alles 0 ist. */
export function emptyNutrients() {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
}

/**
 * Wandelt eine Benutzereingabe in eine Zahl um.
 * Akzeptiert Komma UND Punkt: "12,5" und "12.5" ergeben 12.5.
 * Ungültige oder negative Eingaben ergeben NaN ("keine Zahl").
 *
 * @param {string|number} input
 * @returns {number} Zahl >= 0 oder NaN
 */
export function parseAmount(input) {
  if (typeof input === 'number') {
    return Number.isFinite(input) && input >= 0 ? input : NaN;
  }
  if (typeof input !== 'string') return NaN;

  const cleaned = input.trim().replace(',', '.');
  // erlaubt: "12", "12.5", "12." und ".5" – sonst nichts
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(cleaned)) return NaN;

  return Number(cleaned);
}

/**
 * Rechnet Nährwerte pro 100 g auf eine Menge in Gramm um.
 * Beispiel: 150 g eines Lebensmittels mit 200 kcal/100 g → 300 kcal.
 *
 * @param {{kcal?:number, protein?:number, carbs?:number, fat?:number}} per100g
 * @param {number} grams Menge in Gramm (>= 0)
 * @returns {{kcal:number, protein:number, carbs:number, fat:number}}
 */
export function scaleNutrients(per100g, grams) {
  if (!Number.isFinite(grams) || grams < 0) {
    throw new RangeError(`Ungültige Menge: ${grams}`);
  }
  const result = emptyNutrients();
  for (const key of NUTRIENT_KEYS) {
    result[key] = ((per100g?.[key] ?? 0) * grams) / 100;
  }
  return result;
}

/**
 * Zählt eine Liste von Nährwert-Objekten zusammen (z. B. alle Einträge
 * eines Tages). Fehlende Werte zählen als 0.
 *
 * @param {Array<object>} list
 * @returns {{kcal:number, protein:number, carbs:number, fat:number}}
 */
export function sumNutrients(list) {
  const total = emptyNutrients();
  for (const item of list ?? []) {
    for (const key of NUTRIENT_KEYS) {
      total[key] += item?.[key] ?? 0;
    }
  }
  return total;
}

/**
 * Wie viel ist bis zum Ziel noch übrig? Negativ = Ziel überschritten.
 *
 * @param {object} goals  Tagesziele, z. B. { kcal: 2000, protein: 150, ... }
 * @param {object} totals bisher gegessen
 * @returns {{kcal:number, protein:number, carbs:number, fat:number}}
 */
export function remaining(goals, totals) {
  const result = emptyNutrients();
  for (const key of NUTRIENT_KEYS) {
    result[key] = (goals?.[key] ?? 0) - (totals?.[key] ?? 0);
  }
  return result;
}

/**
 * Anteil vom Ziel als Zahl (0.5 = 50 %). Kann über 1 gehen.
 * Bei Ziel 0 oder ohne Ziel kommt 0 heraus (statt durch 0 zu teilen).
 *
 * @param {number} value
 * @param {number} goal
 * @returns {number}
 */
export function progress(value, goal) {
  if (!Number.isFinite(goal) || goal <= 0) return 0;
  return Math.max(0, value) / goal;
}

/**
 * Berechnet Kalorien aus den Makros (4 / 4 / 9 kcal pro Gramm).
 * Nützlich als Plausibilitätsprüfung oder wenn nur Makros bekannt sind.
 *
 * @param {{protein?:number, carbs?:number, fat?:number}} macros
 * @returns {number}
 */
export function kcalFromMacros(macros) {
  return (
    (macros?.protein ?? 0) * KCAL_PER_GRAM.protein +
    (macros?.carbs ?? 0) * KCAL_PER_GRAM.carbs +
    (macros?.fat ?? 0) * KCAL_PER_GRAM.fat
  );
}

/**
 * Rundet auf eine feste Anzahl Nachkommastellen.
 * Umgeht den klassischen Fehler, dass 1.005 sonst zu 1 statt 1.01 wird.
 *
 * @param {number} value
 * @param {number} [decimals=0]
 * @returns {number}
 */
export function roundTo(value, decimals = 0) {
  const factor = 10 ** decimals;
  const rounded = Math.round((value + Number.EPSILON * Math.sign(value)) * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded; // -0 als 0 anzeigen
}
