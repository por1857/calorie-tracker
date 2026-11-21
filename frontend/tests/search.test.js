// Tests für js/search.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeText, searchFoods } from '../js/search.js';

const food = (name) => ({ id: name, name });
const names = (list) => list.map((f) => f.name);

const FOODS = [
  food('Milchreis'),
  food('Reis gekocht'),
  food('Basmati Reis'),
  food('Hühnerbrust'),
  food('Süßkartoffel'),
  food('Haferflocken'),
];

describe('normalizeText', () => {
  test('klein, ohne Umlaute, ß wird ss, Leerzeichen bereinigt', () => {
    assert.equal(normalizeText('  Süßes   ÄPFEL-Mus '), 'susses apfel-mus');
  });

  test('kommt mit leeren Werten zurecht', () => {
    assert.equal(normalizeText(undefined), '');
    assert.equal(normalizeText(null), '');
  });
});

describe('searchFoods', () => {
  test('ohne Suchtext kommt die Liste unverändert zurück', () => {
    assert.deepEqual(names(searchFoods(FOODS, '  ')), names(FOODS));
  });

  test('Groß-/Kleinschreibung ist egal', () => {
    assert.deepEqual(names(searchFoods(FOODS, 'HAFER')), ['Haferflocken']);
  });

  test('Umlaute und ß sind egal', () => {
    assert.deepEqual(names(searchFoods(FOODS, 'huhner')), ['Hühnerbrust']);
    assert.deepEqual(names(searchFoods(FOODS, 'hühner')), ['Hühnerbrust']);
    assert.deepEqual(names(searchFoods(FOODS, 'susskart')), ['Süßkartoffel']);
  });

  test('mehrere Wörter in beliebiger Reihenfolge', () => {
    assert.deepEqual(names(searchFoods(FOODS, 'gekocht reis')), ['Reis gekocht']);
  });

  test('Namensanfang vor Wortanfang vor irgendwo im Namen', () => {
    assert.deepEqual(names(searchFoods(FOODS, 'reis')), ['Reis gekocht', 'Basmati Reis', 'Milchreis']);
  });

  test('nichts gefunden ergibt eine leere Liste', () => {
    assert.deepEqual(searchFoods(FOODS, 'pizza'), []);
  });

  test('begrenzt die Anzahl der Treffer', () => {
    assert.equal(searchFoods(FOODS, 'reis', 2).length, 2);
    assert.equal(searchFoods(FOODS, '', 3).length, 3);
  });

  test('verändert die übergebene Liste nicht', () => {
    const before = names(FOODS);
    searchFoods(FOODS, 'reis');
    assert.deepEqual(names(FOODS), before);
  });
});
