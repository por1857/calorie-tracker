/**
 * Startet den Store-Vertragstest im Browser – für beide Stores.
 * Jeder IndexedDB-Test bekommt eine eigene, leere Test-Datenbank.
 * Am Ende werden alle Test-Datenbanken wieder gelöscht; deine echten
 * Daten (Datenbank "kalorien-tracker") werden nie angefasst.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { runStoreContract } from '../store-contract.js';
import { createMemoryStore } from '../../js/storage/memory-store.js';
import { createIndexedDBStore, deleteDatabase, DB_NAME } from '../../js/storage/indexeddb-store.js';
import { newId } from '../../js/models.js';

const TEST_PREFIX = 'kt-test-';
const openedStores = [];

runStoreContract('MemoryStore', (options) => createMemoryStore(options));

runStoreContract('IndexedDBStore', async (options) => {
  const dbName = `${TEST_PREFIX}${newId()}`;
  const store = await createIndexedDBStore({ ...options, dbName });
  openedStores.push({ store, dbName });
  return store;
});

test('IndexedDBStore: Daten überstehen das Schließen und erneute Öffnen', async () => {
  const dbName = `${TEST_PREFIX}${newId()}`;
  const first = await createIndexedDBStore({ dbName });
  await first.saveGoals({ kcal: 2345, protein: 1, carbs: 2, fat: 3 });
  first.close();

  const second = await createIndexedDBStore({ dbName });
  openedStores.push({ store: second, dbName });
  assert.equal((await second.getGoals()).kcal, 2345);
});

test('Aufräumen: Test-Datenbanken löschen', async () => {
  for (const { store, dbName } of openedStores) {
    assert.ok(dbName !== DB_NAME, 'darf nie die echte Datenbank löschen');
    store.close();
    await deleteDatabase(dbName);
  }
});
