// Tests für js/dates.js und js/format.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { toDateKey, fromDateKey, addDays } from '../js/dates.js';
import { formatKcal, formatGrams, formatDayHeading } from '../js/format.js';

describe('toDateKey', () => {
  test('nutzt die lokale Zeit und füllt mit Nullen auf', () => {
    assert.equal(toDateKey(new Date(2026, 0, 5, 9, 0)), '2026-01-05');
  });

  test('kurz nach Mitternacht ist schon der neue Tag', () => {
    assert.equal(toDateKey(new Date(2026, 10, 22, 0, 30)), '2026-11-22');
  });
});

describe('fromDateKey', () => {
  test('liest einen gültigen Schlüssel', () => {
    const date = fromDateKey('2026-11-21');
    assert.equal(date.getFullYear(), 2026);
    assert.equal(date.getMonth(), 10);
    assert.equal(date.getDate(), 21);
  });

  test('lehnt falsche Formate und unmögliche Daten ab', () => {
    assert.throws(() => fromDateKey('21.11.2026'), RangeError);
    assert.throws(() => fromDateKey('2026-02-31'), RangeError);
  });
});

describe('addDays', () => {
  test('über Monats- und Jahresgrenzen', () => {
    assert.equal(addDays('2026-01-31', 1), '2026-02-01');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  });

  test('über die Zeitumstellung hinweg', () => {
    // Ende März und Ende Oktober werden die Uhren umgestellt
    assert.equal(addDays('2026-03-28', 2), '2026-03-30');
    assert.equal(addDays('2026-10-24', 2), '2026-10-26');
  });
});

describe('format', () => {
  //   ist ein geschütztes Leerzeichen – so trennt Österreich Tausender
  test('Kalorien ganzzahlig mit Tausendertrennung', () => {
    assert.equal(formatKcal(1240.4), '1 240');
    assert.equal(formatKcal(-0.3), '0');
  });

  test('Gramm: kleine Werte mit einer Nachkommastelle', () => {
    assert.equal(formatGrams(4.25), '4,3');
    assert.equal(formatGrams(12.6), '13');
  });

  test('Tagesüberschrift: Heute, Gestern und andere Tage', () => {
    assert.deepEqual(formatDayHeading('2026-11-21', '2026-11-21'), {
      title: 'Heute',
      subtitle: 'Samstag, 21. November',
    });
    assert.equal(formatDayHeading('2026-11-20', '2026-11-21').title, 'Gestern');
    assert.deepEqual(formatDayHeading('2026-11-18', '2026-11-21'), {
      title: 'Mittwoch',
      subtitle: '18. November',
    });
  });

  test('österreichische Monatsnamen', () => {
    assert.equal(formatDayHeading('2027-01-04', '2027-01-04').subtitle, 'Montag, 4. Jänner');
  });
});
