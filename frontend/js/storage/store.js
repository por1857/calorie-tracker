/**
 * store.js – die EINE Tür zu den gespeicherten Daten
 * ---------------------------------------------------------------------------
 * Die App spricht nur mit einem "Store". Wie er speichert, ist ihr egal.
 * Dadurch können wir den Speicher austauschen, ohne die App umzubauen:
 *
 *   MemoryStore     im Arbeitsspeicher (Demo-Modus, Tests, Notfall)
 *   IndexedDBStore  dauerhaft im iPhone (Standard seit Schritt 2)
 *   SyncStore       Phase 2: iPhone + Abgleich mit dem Java-Backend
 *
 * Jeder Store hat genau diese Funktionen. Alle sind async (geben ein
 * Promise zurück), weil IndexedDB und Cloud nicht sofort antworten.
 * Ob ein Store sich richtig verhält, prüft tests/store-contract.js –
 * jeder neue Store muss diese Tests bestehen.
 *
 * @typedef {object} Store
 *
 * @property {boolean} isPersistent
 *   true = Daten bleiben nach dem Schließen erhalten
 *
 * Lebensmittel (geteilt):
 * @property {() => Promise<object[]>} listFoods
 *   alle nicht gelöschten Lebensmittel, sortiert nach Name
 * @property {(id:string) => Promise<object|null>} getFood
 *   ein Lebensmittel (auch gelöschte, damit alte Einträge es finden)
 * @property {(food:object) => Promise<object>} saveFood
 *   anlegen oder ändern, gibt den gespeicherten Stand zurück
 * @property {(id:string) => Promise<void>} deleteFood
 *   weich löschen (deletedAt setzen)
 *
 * Einträge (privat):
 * @property {(dayKey:string) => Promise<object[]>} listEntries
 *   nicht gelöschte Einträge eines Tages, in Reihenfolge des Anlegens
 * @property {(entry:object) => Promise<object>} saveEntry
 * @property {(id:string) => Promise<void>} deleteEntry
 * @property {(limit?:number) => Promise<object[]>} recentFoods
 *   zuletzt benutzte Lebensmittel (für die Schnellauswahl), neueste zuerst
 *
 * Ziele (privat):
 * @property {() => Promise<object>} getGoals
 *   gespeicherte Ziele oder die Standardziele
 * @property {(goals:object) => Promise<object>} saveGoals
 *
 * Sicherung:
 * @property {() => Promise<object>} exportAll
 *   alles als ein Objekt (für das JSON-Backup, Schritt 7)
 */

import { createMemoryStore } from './memory-store.js';
import { createIndexedDBStore } from './indexeddb-store.js';

/**
 * Öffnet den Store, den die App benutzt.
 *
 * Normalfall: IndexedDB (dauerhaft). Klappt das nicht (sehr alter Browser,
 * manche private Fenster), arbeitet die App im Arbeitsspeicher weiter,
 * statt gar nicht zu starten. store.isPersistent sagt, was gilt.
 *
 * @param {{temporary?: boolean}} [options]
 *   temporary: true = bewusst nur Arbeitsspeicher (Demo-Modus)
 * @returns {Promise<Store>}
 */
export async function openStore({ temporary = false } = {}) {
  if (temporary) return createMemoryStore();

  try {
    const store = await createIndexedDBStore();
    requestPersistentStorage();
    return store;
  } catch (error) {
    console.warn('Dauerhaftes Speichern nicht möglich, nutze Arbeitsspeicher.', error);
    return createMemoryStore();
  }
}

/**
 * Bittet den Browser, unsere Daten nicht automatisch zu löschen, wenn der
 * Speicher knapp wird. Ob er zustimmt, entscheidet der Browser selbst;
 * ein Backup (Schritt 7) bleibt trotzdem wichtig.
 */
function requestPersistentStorage() {
  const storage = globalThis.navigator?.storage;
  if (!storage?.persist) return;
  storage.persisted()
    .then((isPersisted) => isPersisted || storage.persist())
    .catch(() => {}); // kein Problem, wenn es nicht klappt
}
