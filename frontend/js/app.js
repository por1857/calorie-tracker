/**
 * app.js – Startpunkt der App
 * ---------------------------------------------------------------------------
 * Verbindet Daten (Store), Rechenlogik (calc.js) und Oberfläche (index.html).
 *
 * Datenfluss:   Store  →  state  →  render()  →  HTML
 *               Bedienung ändert den Store, danach wird neu gezeichnet.
 *
 * Stand Schritt 1: Daten liegen im MemoryStore (nach Neuladen weg).
 * In Schritt 2 wird nur js/storage/store.js umgestellt – diese Datei bleibt.
 *
 * Tipp: Mit "?demo" am Ende der Adresse gibt es Beispieldaten für heute.
 *
 * SICHERHEITSREGEL: Text immer mit .textContent setzen, NIE mit .innerHTML.
 * Lebensmittelnamen kommen später auch von Freunden – fremder Text darf
 * nie als HTML ausgeführt werden.
 */

import { sumNutrients, remaining, progress, NUTRIENT_KEYS } from './calc.js';
import { toDateKey, addDays } from './dates.js';
import { formatKcal, formatGrams, formatDayHeading } from './format.js';
import { MEALS, createFood, createEntryFromFood } from './models.js';
import { openStore } from './storage/store.js';

// ---- Zustand ------------------------------------------------------------

const state = {
  dayKey: toDateKey(), // welcher Tag angezeigt wird, z. B. "2026-11-21"
  goals: null,
  entries: [],         // Einträge des angezeigten Tages
};

/** @type {import('./storage/store.js').Store} */
let store;

// ---- HTML-Elemente einmal suchen -----------------------------------------

const $ = (selector) => document.querySelector(selector);

const el = {
  dayTitle: $('#day-title'),
  daySubtitle: $('#day-subtitle'),
  prevDay: $('#prev-day'),
  nextDay: $('#next-day'),
  readout: $('#readout'),
  readoutLabel: $('#readout-label'),
  kcalRemaining: $('#kcal-remaining'),
  kcalEaten: $('#kcal-eaten'),
  kcalGoal: $('#kcal-goal'),
  kcalMeter: $('#kcal-meter'),
  meals: $('#meals'),
  mealTemplate: $('#meal-template'),
  addEntry: $('#add-entry'),
  toast: $('#toast'),
};

// ---- Daten laden ----------------------------------------------------------

async function loadDay() {
  [state.goals, state.entries] = await Promise.all([
    store.getGoals(),
    store.listEntries(state.dayKey),
  ]);
}

/** Legt Beispieldaten für heute an (nur mit ?demo). */
async function seedDemo() {
  const dayKey = toDateKey();
  const foods = [
    { name: 'Haferflocken', per100g: { kcal: 372, protein: 13.5, carbs: 58.7, fat: 7 }, grams: 80, meal: 'breakfast' },
    { name: 'Milch 1,5 %', per100g: { kcal: 47, protein: 3.4, carbs: 4.8, fat: 1.5 }, grams: 250, meal: 'breakfast' },
    { name: 'Hühnerbrust', per100g: { kcal: 110, protein: 23, carbs: 0, fat: 1.5 }, grams: 180, meal: 'lunch' },
    { name: 'Reis gekocht', per100g: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 }, grams: 200, meal: 'lunch' },
  ];
  for (const { grams, meal, ...value } of foods) {
    const food = await store.saveFood(createFood(value));
    await store.saveEntry(createEntryFromFood(food, grams, { meal, dayKey }));
  }
}

// ---- Anzeige ------------------------------------------------------------

/** Setzt die Füllung eines Fortschrittsbalkens (Wert 0 bis 1, darüber = rot). */
function setMeter(meter, ratio) {
  meter.style.setProperty('--fill', String(Math.min(ratio, 1)));
  meter.classList.toggle('meter--over', ratio > 1);
  if (meter.hasAttribute('role')) {
    meter.setAttribute('aria-valuenow', String(Math.round(Math.min(ratio, 1) * 100)));
  }
}

function renderHeading() {
  const todayKey = toDateKey();
  const { title, subtitle } = formatDayHeading(state.dayKey, todayKey);
  el.dayTitle.textContent = title;
  el.daySubtitle.textContent = subtitle;
  // In die Zukunft blättern ergibt keinen Sinn
  el.nextDay.disabled = state.dayKey >= todayKey;
}

function renderSummary(totals) {
  const { goals } = state;
  const rest = remaining(goals, totals);
  const isOver = rest.kcal < 0;

  el.readout.classList.toggle('readout--over', isOver);
  el.readoutLabel.textContent = isOver ? 'Über dem Ziel' : 'Noch übrig';
  el.kcalRemaining.textContent = formatKcal(Math.abs(rest.kcal));
  el.kcalEaten.textContent = formatKcal(totals.kcal);
  el.kcalGoal.textContent = formatKcal(goals.kcal);
  setMeter(el.kcalMeter, progress(totals.kcal, goals.kcal));

  for (const key of NUTRIENT_KEYS.filter((k) => k !== 'kcal')) {
    $(`[data-macro-eaten="${key}"]`).textContent = formatGrams(totals[key]);
    $(`[data-macro-goal="${key}"]`).textContent = formatGrams(goals[key]);
    setMeter($(`[data-macro-meter="${key}"]`), progress(totals[key], goals[key]));
  }
}

function renderMeals() {
  el.meals.replaceChildren(); // alte Inhalte entfernen

  for (const meal of MEALS) {
    const entries = state.entries.filter((e) => e.meal === meal.id);
    const section = el.mealTemplate.content.cloneNode(true);

    section.querySelector('.meal__title').textContent = meal.label;
    section.querySelector('.meal__total').textContent =
      entries.length ? `${formatKcal(sumNutrients(entries).kcal)} kcal` : '';
    section.querySelector('.meal__empty').hidden = entries.length > 0;

    const list = section.querySelector('.meal__list');
    for (const entry of entries) list.append(createEntryRow(entry));
    el.meals.append(section);
  }
}

/** Baut eine Zeile für einen Eintrag – nur mit textContent (siehe oben). */
function createEntryRow(entry) {
  const li = document.createElement('li');
  li.className = 'entry';
  li.dataset.id = entry.id; // für Bearbeiten/Löschen in Schritt 5

  const left = document.createElement('div');
  const name = document.createElement('span');
  name.textContent = entry.name;
  left.append(name);

  if (entry.grams != null) { // Schnelleinträge haben keine Gramm
    const meta = document.createElement('span');
    meta.className = 'entry__meta num';
    meta.textContent = `${formatGrams(entry.grams)} g`;
    left.append(meta);
  }

  const kcal = document.createElement('span');
  kcal.className = 'entry__kcal num';
  kcal.textContent = `${formatKcal(entry.kcal)} kcal`;

  li.append(left, kcal);
  return li;
}

async function render() {
  await loadDay();
  renderHeading();
  renderSummary(sumNutrients(state.entries));
  renderMeals();
}

// ---- Rückmeldung ----------------------------------------------------------

let toastTimer;
function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add('toast--visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('toast--visible'), 2200);
}

// ---- Bedienung ----------------------------------------------------------

function bindEvents() {
  el.prevDay.addEventListener('click', () => {
    state.dayKey = addDays(state.dayKey, -1);
    render();
  });

  el.nextDay.addEventListener('click', () => {
    state.dayKey = addDays(state.dayKey, 1);
    render();
  });

  el.addEntry.addEventListener('click', () => showToast('Kommt in Schritt 3'));

  for (const tab of document.querySelectorAll('[data-tab]:not([aria-current])')) {
    tab.addEventListener('click', () => showToast('Kommt in einem späteren Schritt'));
  }

  // Wenn die App über Nacht offen bleibt: beim Zurückkehren neu zeichnen
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') render();
  });
}

// ---- Start --------------------------------------------------------------

async function start() {
  store = await openStore();
  if (new URLSearchParams(location.search).has('demo')) await seedDemo();
  bindEvents();
  await render();
}

start().catch((error) => {
  console.error(error);
  showToast('Die App konnte nicht starten. Lade die Seite neu.');
});
