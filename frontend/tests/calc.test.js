// Tests für js/calc.js
// Ausführen im Projektordner mit:  npm test
// Benutzt den Test-Runner, der in Node.js eingebaut ist – nichts zu installieren.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseAmount,
  scaleNutrients,
  sumNutrients,
  remaining,
  progress,
  kcalFromMacros,
  roundTo,
  emptyNutrients,
} from '../js/calc.js';

describe('parseAmount', () => {
  test('liest ganze Zahlen', () => {
    assert.equal(parseAmount('150'), 150);
  });

  test('akzeptiert Komma und Punkt', () => {
    assert.equal(parseAmount('12,5'), 12.5);
    assert.equal(parseAmount('12.5'), 12.5);
  });

  test('ignoriert Leerzeichen am Rand', () => {
    assert.equal(parseAmount('  80 '), 80);
  });

  test('erlaubt halbe Eingaben wie "12," und ",5"', () => {
    assert.equal(parseAmount('12,'), 12);
    assert.equal(parseAmount(',5'), 0.5);
  });

  test('lehnt Unsinn ab', () => {
    for (const bad of ['', ' ', 'abc', '12g', '-5', '1,2,3', '1.000,5', '1e3']) {
      assert.ok(Number.isNaN(parseAmount(bad)), `"${bad}" sollte NaN sein`);
    }
  });

  test('nimmt auch echte Zahlen, aber keine negativen', () => {
    assert.equal(parseAmount(42), 42);
    assert.ok(Number.isNaN(parseAmount(-1)));
    assert.ok(Number.isNaN(parseAmount(Infinity)));
    assert.ok(Number.isNaN(parseAmount(null)));
  });
});

describe('scaleNutrients', () => {
  const oats = { kcal: 372, protein: 13.5, carbs: 58.7, fat: 7 }; // pro 100 g

  test('100 g ergibt genau die Werte pro 100 g', () => {
    assert.deepEqual(scaleNutrients(oats, 100), oats);
  });

  test('rechnet auf andere Mengen um', () => {
    const result = scaleNutrients(oats, 50);
    assert.equal(result.kcal, 186);
    assert.equal(result.protein, 6.75);
  });

  test('0 g ergibt 0', () => {
    assert.deepEqual(scaleNutrients(oats, 0), emptyNutrients());
  });

  test('fehlende Werte zählen als 0', () => {
    assert.deepEqual(scaleNutrients({ kcal: 100 }, 200), { kcal: 200, protein: 0, carbs: 0, fat: 0 });
  });

  test('wirft Fehler bei ungültiger Menge', () => {
    assert.throws(() => scaleNutrients(oats, -10), RangeError);
    assert.throws(() => scaleNutrients(oats, NaN), RangeError);
  });
});

describe('sumNutrients', () => {
  test('leere Liste ergibt 0', () => {
    assert.deepEqual(sumNutrients([]), emptyNutrients());
  });

  test('addiert alle Einträge', () => {
    const total = sumNutrients([
      { kcal: 300, protein: 20, carbs: 30, fat: 10 },
      { kcal: 150, protein: 5, carbs: 25, fat: 3 },
    ]);
    assert.deepEqual(total, { kcal: 450, protein: 25, carbs: 55, fat: 13 });
  });
});

describe('remaining', () => {
  const goals = { kcal: 2000, protein: 150, carbs: 220, fat: 70 };

  test('zeigt den Rest bis zum Ziel', () => {
    const rest = remaining(goals, { kcal: 760, protein: 40, carbs: 90, fat: 20 });
    assert.deepEqual(rest, { kcal: 1240, protein: 110, carbs: 130, fat: 50 });
  });

  test('wird negativ, wenn das Ziel überschritten ist', () => {
    assert.equal(remaining(goals, { kcal: 2250 }).kcal, -250);
  });
});

describe('progress', () => {
  test('liefert den Anteil vom Ziel', () => {
    assert.equal(progress(500, 2000), 0.25);
  });

  test('darf über 1 gehen', () => {
    assert.equal(progress(3000, 2000), 1.5);
  });

  test('Ziel 0 führt nicht zu Division durch 0', () => {
    assert.equal(progress(100, 0), 0);
  });
});

describe('kcalFromMacros', () => {
  test('rechnet mit 4 / 4 / 9 kcal pro Gramm', () => {
    assert.equal(kcalFromMacros({ protein: 10, carbs: 10, fat: 10 }), 170);
  });
});

describe('roundTo', () => {
  test('rundet kaufmännisch', () => {
    assert.equal(roundTo(2.5), 3);
    assert.equal(roundTo(12.345, 1), 12.3);
  });

  test('umgeht den Gleitkomma-Fehler bei 1.005', () => {
    assert.equal(roundTo(1.005, 2), 1.01);
  });

  test('macht aus -0 eine 0', () => {
    assert.ok(Object.is(roundTo(-0.2), 0));
  });

  test('summiert Gleitkommazahlen sauber', () => {
    // 0.1 + 0.2 ergibt in JavaScript 0.30000000000000004
    assert.equal(roundTo(0.1 + 0.2, 2), 0.3);
  });
});
