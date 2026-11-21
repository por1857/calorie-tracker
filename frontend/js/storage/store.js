/**
 * store.js – die EINE Tür zu den gespeicherten Daten
 * ---------------------------------------------------------------------------
 * Die App spricht nur mit einem "Store". Wie er speichert, ist ihr egal.
 * Dadurch können wir den Speicher austauschen, ohne die App umzubauen:
 *
 *   jetzt      MemoryStore     im Arbeitsspeicher (weg nach Neuladen)
 *   Schritt 2  IndexedDBStore  dauerhaft im iPhone
 *   Phase 2    SyncStore       iPhone + Abgleich mit dem Java-Backend
 *
 * Jeder Store hat genau diese Funktionen. Alle sind async (geben ein
 * Promise zurück), weil IndexedDB und Cloud nicht sofort antworten.
 * Ob ein Store sich richtig verhält, prüft tests/store-contract.js –
 * jeder neue Store muss diese Tests bestehen.
 *
 * @typedef {object} Store
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

/**
 * Öffnet den Store, den die App benutzt.
 * In Schritt 2 wird hier auf createIndexedDBStore() umgestellt.
 *
 * @param {object} [options] wird an den Store weitergegeben (z. B. now für Tests)
 * @returns {Promise<Store>}
 */
export async function openStore(options) {
  return createMemoryStore(options);
}
