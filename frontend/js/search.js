/**
 * search.js – Lebensmittel suchen
 * ---------------------------------------------------------------------------
 * Tolerant beim Tippen am Handy:
 *  - Groß-/Kleinschreibung egal
 *  - Umlaute und ß egal: "huhner" findet "Hühnerbrust", "susskartoffel"
 *    findet "Süßkartoffel"
 *  - mehrere Wörter in beliebiger Reihenfolge: "gekocht reis" findet "Reis gekocht"
 *
 * Reihenfolge der Treffer:
 *  1. Name beginnt mit der Suche          ("reis" → "Reis gekocht")
 *  2. ein Wort im Namen beginnt damit     ("reis" → "Basmati Reis")
 *  3. Suche steckt irgendwo im Namen      ("reis" → "Milchreis")
 *  innerhalb gleicher Stufe alphabetisch.
 */

export const SEARCH_LIMIT = 50;

const RANK_NAME_START = 0;
const RANK_WORD_START = 1;
const RANK_CONTAINS = 2;

/** Macht Text vergleichbar: klein, ohne Akzente, ß → ss, einfache Leerzeichen. */
export function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Akzente und Umlaut-Punkte entfernen
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Filtert und sortiert Lebensmittel nach einer Suche.
 * Ohne Suchtext kommt die Liste unverändert zurück (gekürzt auf limit).
 *
 * @param {object[]} foods
 * @param {string} query
 * @param {number} [limit]
 * @returns {object[]} neue Liste, das Original bleibt unverändert
 */
export function searchFoods(foods, query, limit = SEARCH_LIMIT) {
  const needle = normalizeText(query);
  if (!needle) return foods.slice(0, limit);

  const words = needle.split(' ');
  const hits = [];
  for (const food of foods) {
    const name = normalizeText(food.name);
    if (!words.every((word) => name.includes(word))) continue;
    hits.push({ food, name, rank: rankMatch(name, needle, words[0]) });
  }

  hits.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, 'de'));
  return hits.slice(0, limit).map((hit) => hit.food);
}

function rankMatch(name, needle, firstWord) {
  if (name.startsWith(needle)) return RANK_NAME_START;
  if (name.split(' ').some((part) => part.startsWith(firstWord))) return RANK_WORD_START;
  return RANK_CONTAINS;
}
