/**
 * memory-store.js – Store im Arbeitsspeicher
 * ---------------------------------------------------------------------------
 * Hält alles in JavaScript-Maps. Nach dem Neuladen ist alles weg.
 * Wofür trotzdem? Für Tests, für den Demo-Modus und als Vorlage:
 * der IndexedDB-Store in Schritt 2 hat genau dieselben Funktionen.
 *
 * Alle Funktionen geben KOPIEN zurück (structuredClone). Sonst könnte die
 * App gespeicherte Daten aus Versehen direkt verändern – IndexedDB und die
 * Cloud verhalten sich genauso.
 */

import { DEFAULT_GOALS, createGoals, isActive, systemClock } from '../models.js';

/**
 * @param {{now?: () => string}} [options] now = Uhr (in Tests eine feste Zeit)
 * @returns {import('./store.js').Store}
 */
export function createMemoryStore({ now = systemClock } = {}) {
  const foods = new Map();
  const entries = new Map();
  let goals = null;

  const copy = (value) => (value == null ? value : structuredClone(value));

  const store = {
    isPersistent: false, // nach dem Neuladen ist alles weg

    // ---- Lebensmittel ------------------------------------------------------
    async listFoods() {
      return [...foods.values()]
        .filter(isActive)
        .sort((a, b) => a.name.localeCompare(b.name, 'de'))
        .map(copy);
    },

    async getFood(id) {
      return copy(foods.get(id) ?? null);
    },

    async saveFood(food) {
      requireId(food);
      const saved = { ...food, updatedAt: food.updatedAt ?? now() };
      foods.set(food.id, copy(saved));
      return copy(saved);
    },

    async deleteFood(id) {
      const food = foods.get(id);
      if (!food || !isActive(food)) return;
      const time = now();
      foods.set(id, { ...food, deletedAt: time, updatedAt: time });
    },

    // ---- Einträge ----------------------------------------------------------
    async listEntries(dayKey) {
      return [...entries.values()]
        .filter((e) => e.dayKey === dayKey && isActive(e))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map(copy);
    },

    async saveEntry(entry) {
      requireId(entry);
      const saved = { ...entry, updatedAt: entry.updatedAt ?? now() };
      entries.set(entry.id, copy(saved));
      return copy(saved);
    },

    async deleteEntry(id) {
      const entry = entries.get(id);
      if (!entry || !isActive(entry)) return;
      const time = now();
      entries.set(id, { ...entry, deletedAt: time, updatedAt: time });
    },

    async recentFoods(limit = 8) {
      const lastUse = new Map(); // foodId → letzter Zeitpunkt
      for (const e of entries.values()) {
        if (!e.foodId || !isActive(e)) continue;
        if ((lastUse.get(e.foodId) ?? '') < e.createdAt) lastUse.set(e.foodId, e.createdAt);
      }
      return [...lastUse.entries()]
        .sort((a, b) => b[1].localeCompare(a[1]))
        .map(([id]) => foods.get(id))
        .filter((f) => f && isActive(f))
        .slice(0, limit)
        .map(copy);
    },

    // ---- Ziele -------------------------------------------------------------
    async getGoals() {
      return copy(goals ?? createGoals(DEFAULT_GOALS, { now }));
    },

    async saveGoals(values) {
      goals = { ...createGoals(values, { now }), userId: values.userId ?? null };
      return copy(goals);
    },

    // ---- Sicherung ---------------------------------------------------------
    async exportAll() {
      return {
        app: 'kalorien-tracker',
        version: 1,
        exportedAt: now(),
        foods: [...foods.values()].map(copy),
        entries: [...entries.values()].map(copy),
        goals: copy(goals),
      };
    },
  };

  return store;
}

function requireId(record) {
  if (!record?.id) throw new TypeError('Datensatz ohne id kann nicht gespeichert werden.');
}
