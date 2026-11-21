/**
 * Ersatz für "node:test" im Browser
 * ---------------------------------------------------------------------------
 * Node.js hat kein IndexedDB, der Browser schon. Damit derselbe Vertragstest
 * (tests/store-contract.js) auch im Browser läuft, leitet tests/browser.html
 * den Import "node:test" auf diese Datei um (Import-Map).
 *
 * Kann nur, was unsere Tests brauchen: describe() und test(), nacheinander,
 * auch mit async-Funktionen. Das Ergebnis erscheint auf der Seite.
 */

const registered = [];
const groupNames = [];
let isScheduled = false;

export function describe(name, body) {
  groupNames.push(name);
  try {
    body();
  } finally {
    groupNames.pop();
  }
}

export function test(name, body) {
  registered.push({ name: [...groupNames, name].join(' › '), body });
  if (!isScheduled) {
    isScheduled = true;
    setTimeout(runAll, 0); // erst starten, wenn alle Tests angemeldet sind
  }
}

async function runAll() {
  const list = document.querySelector('#results');
  const summary = document.querySelector('#summary');
  let passed = 0;
  let failed = 0;

  for (const { name, body } of registered) {
    const row = document.createElement('li');
    try {
      await body();
      passed++;
      row.className = 'result result--pass';
      row.textContent = `✓ ${name}`;
    } catch (error) {
      failed++;
      row.className = 'result result--fail';
      row.textContent = `✗ ${name}: ${error?.message ?? error}`;
      console.error(name, error);
    }
    list.append(row);
  }

  summary.textContent = failed === 0
    ? `Alle ${passed} Tests bestanden.`
    : `${failed} von ${passed + failed} Tests fehlgeschlagen.`;
  summary.dataset.state = failed === 0 ? 'pass' : 'fail';
  document.title = `${failed === 0 ? '✓' : '✗'} Browser-Tests`;
}
