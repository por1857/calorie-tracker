// Vertragstest für Stores
// ---------------------------------------------------------------------------
// Diese Tests beschreiben, wie sich JEDER Store verhalten muss (siehe
// js/storage/store.js). Die Datei endet bewusst nicht auf .test.js, damit
// sie nicht allein läuft. Stattdessen ruft jeder Store-Test sie auf:
//
//   runStoreContract('MemoryStore', (opts) => createMemoryStore(opts));
//
// Später einfach dasselbe für den IndexedDB- und den Cloud-Store.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { createFood, createEntryFromFood, createQuickEntry, DEFAULT_GOALS } from '../js/models.js';

/** Uhr, die bei jeder Abfrage eine Sekunde weiterläuft. */
function fakeClock() {
  let t = Date.parse('2026-11-21T10:00:00.000Z');
  return () => new Date((t += 1000)).toISOString();
}

const per100g = (kcal) => ({ kcal, protein: 1, carbs: 1, fat: 1 });

/**
 * @param {string} name             Name des Stores in der Testausgabe
 * @param {(opts:{now:Function}) => Promise<object>|object} makeStore  erzeugt einen LEEREN Store
 */
export function runStoreContract(name, makeStore) {
  describe(`${name}: erfüllt den Store-Vertrag`, () => {
    async function setup() {
      const now = fakeClock();
      const store = await makeStore({ now });
      return { store, now };
    }

    test('ein neuer Store ist leer und liefert Standardziele', async () => {
      const { store } = await setup();
      assert.deepEqual(await store.listFoods(), []);
      assert.deepEqual(await store.listEntries('2026-11-21'), []);
      const goals = await store.getGoals();
      assert.equal(goals.kcal, DEFAULT_GOALS.kcal);
    });

    test('Lebensmittel speichern und nach Name sortiert lesen', async () => {
      const { store, now } = await setup();
      await store.saveFood(createFood({ name: 'Banane', per100g: per100g(89) }, { now }));
      await store.saveFood(createFood({ name: 'Äpfel', per100g: per100g(52) }, { now }));
      await store.saveFood(createFood({ name: 'Zucchini', per100g: per100g(17) }, { now }));
      const names = (await store.listFoods()).map((f) => f.name);
      assert.deepEqual(names, ['Äpfel', 'Banane', 'Zucchini']);
    });

    test('gibt Kopien heraus, keine Originale', async () => {
      const { store, now } = await setup();
      const food = await store.saveFood(createFood({ name: 'Reis', per100g: per100g(130) }, { now }));
      food.name = 'verändert';
      const [listed] = await store.listFoods();
      listed.per100g.kcal = 999;
      const stored = await store.getFood(food.id);
      assert.equal(stored.name, 'Reis');
      assert.equal(stored.per100g.kcal, 130);
    });

    test('Speichern mit gleicher id ersetzt den alten Stand', async () => {
      const { store, now } = await setup();
      const food = createFood({ name: 'Reis', per100g: per100g(130) }, { now });
      await store.saveFood(food);
      await store.saveFood({ ...food, name: 'Reis gekocht' });
      const list = await store.listFoods();
      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'Reis gekocht');
    });

    test('Löschen ist weich: weg aus der Liste, aber per id noch auffindbar', async () => {
      const { store, now } = await setup();
      const food = await store.saveFood(createFood({ name: 'Reis', per100g: per100g(130) }, { now }));
      await store.deleteFood(food.id);
      assert.deepEqual(await store.listFoods(), []);
      const stored = await store.getFood(food.id);
      assert.ok(stored.deletedAt);
      assert.equal(stored.updatedAt, stored.deletedAt);
    });

    test('Einträge eines Tages, in Reihenfolge des Anlegens', async () => {
      const { store, now } = await setup();
      const rice = createFood({ name: 'Reis', per100g: per100g(130) }, { now });
      const a = createEntryFromFood(rice, 100, { meal: 'lunch', dayKey: '2026-11-21', now });
      const b = createQuickEntry({ kcal: 200 }, { meal: 'snack', dayKey: '2026-11-21', now });
      const other = createQuickEntry({ kcal: 50 }, { meal: 'snack', dayKey: '2026-11-20', now });
      await store.saveEntry(b);
      await store.saveEntry(other);
      await store.saveEntry(a);
      const ids = (await store.listEntries('2026-11-21')).map((e) => e.id);
      assert.deepEqual(ids, [a.id, b.id]);
    });

    test('gelöschte Einträge verschwinden aus dem Tag', async () => {
      const { store, now } = await setup();
      const entry = createQuickEntry({ kcal: 200 }, { meal: 'snack', dayKey: '2026-11-21', now });
      await store.saveEntry(entry);
      await store.deleteEntry(entry.id);
      assert.deepEqual(await store.listEntries('2026-11-21'), []);
    });

    test('zuletzt benutzte Lebensmittel: neueste zuerst, ohne gelöschte', async () => {
      const { store, now } = await setup();
      const make = (n) => createFood({ name: n, per100g: per100g(100) }, { now });
      const [oats, rice, milk] = [make('Hafer'), make('Reis'), make('Milch')];
      for (const f of [oats, rice, milk]) await store.saveFood(f);
      const use = (food) => store.saveEntry(createEntryFromFood(food, 100, { meal: 'lunch', dayKey: '2026-11-21', now }));
      await use(oats);
      await use(rice);
      await use(milk);
      await use(oats); // Hafer zuletzt
      await store.deleteFood(milk.id);
      const recent = (await store.recentFoods()).map((f) => f.name);
      assert.deepEqual(recent, ['Hafer', 'Reis']);
      assert.equal((await store.recentFoods(1)).length, 1);
    });

    test('Ziele speichern und lesen', async () => {
      const { store } = await setup();
      await store.saveGoals({ kcal: 2400, protein: 180, carbs: 250, fat: 80 });
      const goals = await store.getGoals();
      assert.deepEqual([goals.kcal, goals.protein, goals.carbs, goals.fat], [2400, 180, 250, 80]);
    });

    test('Export enthält auch gelöschte Datensätze (für den Abgleich)', async () => {
      const { store, now } = await setup();
      const food = await store.saveFood(createFood({ name: 'Reis', per100g: per100g(130) }, { now }));
      await store.deleteFood(food.id);
      const backup = await store.exportAll();
      assert.equal(backup.version, 1);
      assert.equal(backup.foods.length, 1);
      assert.ok(backup.foods[0].deletedAt);
    });

    test('Datensatz ohne id wird abgelehnt', async () => {
      const { store } = await setup();
      await assert.rejects(store.saveFood({ name: 'ohne id' }), TypeError);
    });
  });
}
