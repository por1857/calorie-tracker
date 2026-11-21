// Tests für js/models.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  newId,
  validateFoodInput,
  validateGrams,
  createFood,
  updateFood,
  createEntryFromFood,
  createQuickEntry,
  createGoals,
  markDeleted,
  isActive,
  suggestMeal,
  DEFAULT_GOALS,
  MEAL_IDS,
} from '../js/models.js';

/** Feste Uhr für Tests: jede Abfrage eine Sekunde später. */
function fakeClock(start = '2026-11-21T10:00:00.000Z') {
  let t = Date.parse(start);
  return () => new Date((t += 1000) - 1000).toISOString();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newId', () => {
  test('liefert UUIDs, die sich nicht wiederholen', () => {
    const ids = new Set(Array.from({ length: 200 }, newId));
    assert.equal(ids.size, 200);
    for (const id of ids) assert.match(id, UUID);
  });

  test('funktioniert auch ohne crypto.randomUUID (http im WLAN)', () => {
    crypto.randomUUID = undefined; // überdeckt die echte Funktion
    try {
      assert.match(newId(), UUID);
    } finally {
      delete crypto.randomUUID;
    }
  });
});

describe('validateFoodInput', () => {
  test('gültige Eingabe mit Komma', () => {
    const result = validateFoodInput({ name: ' Haferflocken ', kcal: '372', protein: '13,5', carbs: '58,7', fat: '7' });
    assert.equal(result.ok, true);
    assert.deepEqual(result.value, {
      name: 'Haferflocken',
      per100g: { kcal: 372, protein: 13.5, carbs: 58.7, fat: 7 },
      defaultGrams: null,
    });
  });

  test('leere Makros zählen als 0, Portion ist optional', () => {
    const result = validateFoodInput({ name: 'Cola', kcal: '42', carbs: '10,6', defaultGrams: '330' });
    assert.deepEqual(result.value.per100g, { kcal: 42, protein: 0, carbs: 10.6, fat: 0 });
    assert.equal(result.value.defaultGrams, 330);
  });

  test('mehrere Leerzeichen im Namen werden zu einem', () => {
    assert.equal(validateFoodInput({ name: 'Reis   gekocht', kcal: '130' }).value.name, 'Reis gekocht');
  });

  test('meldet fehlenden Namen und ungültige Kalorien', () => {
    const { ok, errors } = validateFoodInput({ name: '   ', kcal: 'abc' });
    assert.equal(ok, false);
    assert.ok(errors.name);
    assert.ok(errors.kcal);
  });

  test('Kalorien sind Pflicht', () => {
    assert.ok(validateFoodInput({ name: 'X', kcal: '' }).errors.kcal);
  });

  test('zu langer Name', () => {
    assert.ok(validateFoodInput({ name: 'x'.repeat(81), kcal: '1' }).errors.name);
  });

  test('erkennt unmögliche Werte', () => {
    assert.ok(validateFoodInput({ name: 'X', kcal: '950' }).errors.kcal);
    assert.ok(validateFoodInput({ name: 'X', kcal: '500', protein: '50', carbs: '40', fat: '20' }).errors.form);
  });

  test('Portion 0 ist ungültig', () => {
    assert.ok(validateFoodInput({ name: 'X', kcal: '1', defaultGrams: '0' }).errors.defaultGrams);
  });
});

describe('validateGrams', () => {
  test('akzeptiert positive Mengen', () => {
    assert.deepEqual(validateGrams('80,5'), { ok: true, value: 80.5 });
  });

  test('lehnt 0, leer und Text ab', () => {
    for (const bad of ['0', '', 'viel']) assert.equal(validateGrams(bad).ok, false);
  });
});

describe('Lebensmittel', () => {
  const value = { name: 'Haferflocken', per100g: { kcal: 372, protein: 13.5, carbs: 58.7, fat: 7 }, defaultGrams: 80 };

  test('createFood setzt id, Zeitstempel und Ersteller', () => {
    const food = createFood(value, { userId: 'user-1', now: fakeClock() });
    assert.match(food.id, UUID);
    assert.equal(food.createdBy, 'user-1');
    assert.equal(food.createdAt, '2026-11-21T10:00:00.000Z');
    assert.equal(food.updatedAt, food.createdAt);
    assert.equal(food.deletedAt, null);
    assert.ok(isActive(food));
  });

  test('ohne Cloud ist createdBy null', () => {
    assert.equal(createFood(value).createdBy, null);
  });

  test('updateFood ändert Werte, aber nie id, Ersteller oder Anlagedatum', () => {
    const now = fakeClock();
    const food = createFood(value, { userId: 'user-1', now });
    const changed = updateFood(food, { id: 'hack', createdBy: 'user-2', per100g: { kcal: 380 } }, { now });
    assert.equal(changed.id, food.id);
    assert.equal(changed.createdBy, 'user-1');
    assert.equal(changed.createdAt, food.createdAt);
    assert.equal(changed.per100g.kcal, 380);
    assert.equal(changed.per100g.protein, 13.5); // nicht verloren
    assert.ok(changed.updatedAt > food.updatedAt);
  });

  test('markDeleted löscht weich', () => {
    const deleted = markDeleted(createFood(value), { now: fakeClock() });
    assert.equal(isActive(deleted), false);
    assert.equal(deleted.deletedAt, deleted.updatedAt);
  });
});

describe('Einträge', () => {
  const food = createFood({ name: 'Reis', per100g: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 } });

  test('createEntryFromFood rechnet um und kopiert den Namen', () => {
    const entry = createEntryFromFood(food, 200, { meal: 'lunch', dayKey: '2026-11-21' });
    assert.equal(entry.name, 'Reis');
    assert.equal(entry.foodId, food.id);
    assert.equal(entry.kcal, 260);
    assert.equal(entry.carbs, 56);
    assert.equal(entry.userId, null);
    assert.equal(entry.dayKey, '2026-11-21');
  });

  test('unbekannte Mahlzeit wird abgelehnt', () => {
    assert.throws(() => createEntryFromFood(food, 100, { meal: 'brunch', dayKey: '2026-11-21' }), RangeError);
  });

  test('Schnelleintrag ohne Lebensmittel', () => {
    const entry = createQuickEntry({ kcal: 250, protein: 10 }, { meal: 'snack', dayKey: '2026-11-21' });
    assert.equal(entry.foodId, null);
    assert.equal(entry.grams, null);
    assert.equal(entry.name, 'Schnelleintrag');
    assert.deepEqual([entry.kcal, entry.protein, entry.carbs, entry.fat], [250, 10, 0, 0]);
  });
});

describe('suggestMeal', () => {
  const at = (hours, minutes = 0) => new Date(2026, 10, 21, hours, minutes);

  test('schlägt die Mahlzeit passend zur Uhrzeit vor', () => {
    assert.equal(suggestMeal(at(7, 30)), 'breakfast');
    assert.equal(suggestMeal(at(12, 15)), 'lunch');
    assert.equal(suggestMeal(at(19)), 'dinner');
  });

  test('zwischen den Mahlzeiten und in der Nacht: Snack', () => {
    assert.equal(suggestMeal(at(16)), 'snack');
    assert.equal(suggestMeal(at(23)), 'snack');
    assert.equal(suggestMeal(at(2)), 'snack');
  });

  test('Grenzen: Beginn zählt dazu, Ende nicht', () => {
    assert.equal(suggestMeal(at(10, 29)), 'breakfast');
    assert.equal(suggestMeal(at(10, 30)), 'lunch');
    assert.equal(suggestMeal(at(21, 30)), 'snack');
  });

  test('jeder Vorschlag ist eine gültige Mahlzeit', () => {
    for (let hour = 0; hour < 24; hour++) assert.ok(MEAL_IDS.includes(suggestMeal(at(hour))));
  });
});

describe('Ziele', () => {
  test('Standardziele', () => {
    const goals = createGoals();
    assert.equal(goals.id, 'goals');
    assert.equal(goals.kcal, DEFAULT_GOALS.kcal);
  });
});
