/**
 * indexeddb-store.js – Store, der dauerhaft im Browser speichert
 * ---------------------------------------------------------------------------
 * IndexedDB ist eine kleine Datenbank, die jeder Browser mitbringt.
 * Die Daten bleiben nach dem Schließen der App erhalten und liegen nur
 * auf diesem Gerät, nur für diese Adresse.
 *
 * Aufbau der Datenbank ("Object Stores" sind so etwas wie Tabellen):
 *   foods     Lebensmittel, Schlüssel: id
 *   entries   Einträge, Schlüssel: id, zusätzlich Index "dayKey"
 *   settings  Einstellungen, Schlüssel: id (z. B. "goals")
 *
 * Gleiche Funktionen wie memory-store.js, geprüft durch denselben
 * Vertragstest (tests/store-contract.js), der im Browser läuft:
 * tests/browser.html
 */

import { DEFAULT_GOALS, createGoals, isActive, systemClock } from '../models.js';

export const DB_NAME = 'kalorien-tracker';

const FOODS = 'foods';
const ENTRIES = 'entries';
const SETTINGS = 'settings';
const GOALS_ID = 'goals';

/**
 * Versionen der Datenbank – funktioniert wie Flyway-Migrationen:
 * Jede Stufe baut auf der vorigen auf. Eine Stufe, die schon auf deinem
 * iPhone lief, wird NIE geändert. Änderungen = neue Stufe hinten anhängen.
 */
const MIGRATIONS = [
  // Version 1: Grundaufbau
  (db) => {
    db.createObjectStore(FOODS, { keyPath: 'id' });
    const entries = db.createObjectStore(ENTRIES, { keyPath: 'id' });
    entries.createIndex('dayKey', 'dayKey');
    db.createObjectStore(SETTINGS, { keyPath: 'id' });
  },
];

const DB_VERSION = MIGRATIONS.length;

/**
 * Öffnet (oder erstellt) die Datenbank und liefert den Store.
 *
 * @param {{now?: () => string, dbName?: string}} [options]
 *   dbName nur für Tests ändern, damit jeder Test eine leere Datenbank hat
 * @returns {Promise<import('./store.js').Store & {close: () => void}>}
 */
export async function createIndexedDBStore({ now = systemClock, dbName = DB_NAME } = {}) {
  const db = await openDatabase(dbName);

  /** Liest alle Datensätze (optional über einen Index). */
  function getAll(storeName, query, indexName) {
    const objectStore = db.transaction(storeName).objectStore(storeName);
    const source = indexName ? objectStore.index(indexName) : objectStore;
    return requestToPromise(source.getAll(query));
  }

  function getOne(storeName, key) {
    return requestToPromise(db.transaction(storeName).objectStore(storeName).get(key));
  }

  async function put(storeName, record) {
    const transaction = db.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).put(record);
    await transactionDone(transaction);
  }

  /** Setzt deletedAt in EINER Transaktion: lesen und schreiben ohne Lücke. */
  async function softDelete(storeName, id) {
    const transaction = db.transaction(storeName, 'readwrite');
    const objectStore = transaction.objectStore(storeName);
    const request = objectStore.get(id);
    request.onsuccess = () => {
      const record = request.result;
      if (!record || !isActive(record)) return;
      const time = now();
      objectStore.put({ ...record, deletedAt: time, updatedAt: time });
    };
    await transactionDone(transaction);
  }

  /** Speichert und gibt eine unabhängige Kopie zurück. */
  async function save(storeName, record) {
    requireId(record);
    const saved = { ...record, updatedAt: record.updatedAt ?? now() };
    await put(storeName, saved);
    return structuredClone(saved);
  }

  return {
    isPersistent: true,

    // ---- Lebensmittel ------------------------------------------------------
    async listFoods() {
      const foods = await getAll(FOODS);
      return foods.filter(isActive).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    },

    async getFood(id) {
      return (await getOne(FOODS, id)) ?? null;
    },

    saveFood: (food) => save(FOODS, food),
    deleteFood: (id) => softDelete(FOODS, id),

    // ---- Einträge ----------------------------------------------------------
    async listEntries(dayKey) {
      const entries = await getAll(ENTRIES, dayKey, 'dayKey');
      return entries.filter(isActive).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    saveEntry: (entry) => save(ENTRIES, entry),
    deleteEntry: (id) => softDelete(ENTRIES, id),

    async recentFoods(limit = 8) {
      const lastUse = new Map(); // foodId → letzter Zeitpunkt
      for (const entry of await getAll(ENTRIES)) {
        if (!entry.foodId || !isActive(entry)) continue;
        if ((lastUse.get(entry.foodId) ?? '') < entry.createdAt) lastUse.set(entry.foodId, entry.createdAt);
      }
      const ids = [...lastUse.entries()].sort((a, b) => b[1].localeCompare(a[1])).map(([id]) => id);

      const recent = [];
      for (const id of ids) {
        const food = await getOne(FOODS, id);
        if (food && isActive(food)) recent.push(food);
        if (recent.length === limit) break;
      }
      return recent;
    },

    // ---- Ziele -------------------------------------------------------------
    async getGoals() {
      return (await getOne(SETTINGS, GOALS_ID)) ?? createGoals(DEFAULT_GOALS, { now });
    },

    async saveGoals(values) {
      const goals = { ...createGoals(values, { now }), userId: values.userId ?? null };
      await put(SETTINGS, goals);
      return structuredClone(goals);
    },

    // ---- Sicherung ---------------------------------------------------------
    async exportAll() {
      const [foods, entries, goals] = await Promise.all([
        getAll(FOODS),
        getAll(ENTRIES),
        getOne(SETTINGS, GOALS_ID),
      ]);
      return { app: 'kalorien-tracker', version: 1, exportedAt: now(), foods, entries, goals: goals ?? null };
    },

    /** Verbindung schließen (für Tests, bevor die Test-Datenbank gelöscht wird). */
    close() {
      db.close();
    },
  };
}

/** Löscht eine Datenbank komplett (nur für Tests gedacht). */
export function deleteDatabase(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve(); // wird gelöscht, sobald alles zu ist
  });
}

// ---- Hilfsfunktionen ----------------------------------------------------------

function openDatabase(name) {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('IndexedDB ist in diesem Browser nicht verfügbar.'));
      return;
    }
    const request = indexedDB.open(name, DB_VERSION);

    request.onupgradeneeded = (event) => {
      // nur die Stufen ausführen, die diesem Gerät noch fehlen
      for (let version = event.oldVersion; version < DB_VERSION; version++) {
        MIGRATIONS.at(version)(request.result);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      // Lädt eine neuere App-Version in einem anderen Tab, Platz machen
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error('Speichern abgebrochen.'));
  });
}

function requireId(record) {
  if (!record?.id) throw new TypeError('Datensatz ohne id kann nicht gespeichert werden.');
}
