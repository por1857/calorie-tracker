/**
 * entry-sheet.js – Fenster "Eintrag hinzufügen"
 * ---------------------------------------------------------------------------
 * Drei Ansichten im selben <dialog> (siehe index.html, data-view):
 *
 *   pick      Lebensmittel suchen oder aus "Zuletzt verwendet" wählen
 *   amount    Menge eingeben, Mahlzeit wählen, Vorschau, "Eintragen"
 *   new-food  neues Lebensmittel anlegen, danach weiter zu "amount"
 *
 * Rechnen, Prüfen und Speichern passiert NICHT hier, sondern in calc.js,
 * models.js und im Store. Diese Datei verbindet nur Oberfläche und Logik.
 * Text ins DOM nur mit textContent (Lebensmittelnamen sind Benutzereingaben).
 */

import { scaleNutrients } from '../calc.js';
import { formatGrams, formatInputNumber, formatKcal } from '../format.js';
import {
  MEALS,
  createEntryFromFood,
  createFood,
  suggestMeal,
  validateFoodInput,
  validateGrams,
} from '../models.js';
import { searchFoods } from '../search.js';

const RECENT_LIMIT = 6;
const SAVE_FAILED = 'Speichern hat nicht geklappt. Versuch es noch einmal.';
const DEFAULT_GRAMS = 100;
const FOOD_FIELDS = ['name', 'kcal', 'protein', 'carbs', 'fat', 'defaultGrams'];

const VIEW_TITLES = Object.freeze({
  'pick': 'Eintrag hinzufügen',
  'amount': 'Menge',
  'new-food': 'Neues Lebensmittel',
});

/**
 * @param {object} options
 * @param {import('../storage/store.js').Store} options.store
 * @param {() => string} options.getDayKey  Tag, in den eingetragen wird
 * @param {() => void} options.onSaved      wird nach dem Eintragen aufgerufen
 * @returns {{open: () => Promise<void>}}
 */
export function createEntrySheet({ store, getDayKey, onSaved }) {
  const dialog = document.querySelector('#entry-sheet');
  const find = (selector) => dialog.querySelector(selector);

  const el = {
    title: find('#sheet-title'),
    back: find('#sheet-back'),
    close: find('#sheet-close'),
    search: find('#food-search'),
    recentGroup: find('#recent-group'),
    recentList: find('#recent-list'),
    allGroup: find('#all-group'),
    allLabel: find('#all-label'),
    allList: find('#all-list'),
    empty: find('#food-empty'),
    newFoodButton: find('#new-food-button'),
    amountForm: find('#amount-form'),
    amountFood: find('#amount-food'),
    amountPer100: find('#amount-per100'),
    grams: find('#amount-grams'),
    mealOptions: find('#meal-options'),
    foodForm: find('#food-form'),
    foodFormError: find('#food-form-error'),
  };

  const sheet = { foods: [], recent: [], selectedFood: null };

  buildMealOptions(el.mealOptions);
  bindEvents();

  // ---- Öffnen und Ansichten wechseln ---------------------------------------

  async function open() {
    [sheet.foods, sheet.recent] = await Promise.all([
      store.listFoods(),
      store.recentFoods(RECENT_LIMIT),
    ]);
    el.search.value = '';
    setMeal(suggestMeal());
    renderFoodLists();
    showView('pick');
    dialog.showModal();
    // Ohne "Zuletzt verwendet" gleich die Tastatur für die Suche öffnen
    if (sheet.recent.length === 0) el.search.focus();
    else el.close.focus();
  }

  function showView(name) {
    for (const view of dialog.querySelectorAll('[data-view]')) {
      view.hidden = view.dataset.view !== name;
    }
    el.title.textContent = VIEW_TITLES[name];
    el.back.hidden = name === 'pick';
    find('.sheet__body').scrollTop = 0;
  }

  // ---- Ansicht "pick" ----------------------------------------------------

  function renderFoodLists() {
    const query = el.search.value.trim();
    const hasQuery = query !== '';
    const recentIds = new Set(sheet.recent.map((f) => f.id));

    const recent = hasQuery ? [] : sheet.recent;
    const others = hasQuery
      ? searchFoods(sheet.foods, query)
      : sheet.foods.filter((f) => !recentIds.has(f.id));

    el.recentGroup.hidden = recent.length === 0;
    el.recentList.replaceChildren(...recent.map(createFoodOption));

    el.allGroup.hidden = others.length === 0;
    el.allLabel.textContent = hasQuery ? 'Treffer' : 'Alle Lebensmittel';
    el.allList.replaceChildren(...others.map(createFoodOption));

    const isEmpty = recent.length === 0 && others.length === 0;
    el.empty.hidden = !isEmpty;
    el.empty.textContent = hasQuery ? 'Nichts gefunden.' : 'Noch keine Lebensmittel. Leg dein erstes an.';
    el.newFoodButton.textContent = hasQuery ? `„${query}“ anlegen` : 'Neues Lebensmittel anlegen';
  }

  function createFoodOption(food) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'food-option';

    const name = document.createElement('span');
    name.className = 'food-option__name';
    name.textContent = food.name;

    const meta = document.createElement('span');
    meta.className = 'food-option__meta num';
    meta.textContent = `${formatKcal(food.per100g.kcal)} kcal/100 g`;

    button.append(name, meta);
    button.addEventListener('click', () => selectFood(food));
    item.append(button);
    return item;
  }

  // ---- Ansicht "amount" ----------------------------------------------------

  function selectFood(food) {
    sheet.selectedFood = food;
    el.amountFood.textContent = food.name;
    el.amountPer100.textContent = `${formatKcal(food.per100g.kcal)} kcal pro 100 g`;
    el.grams.value = formatInputNumber(food.defaultGrams ?? DEFAULT_GRAMS);
    setFieldError(el.amountForm, 'grams', '');
    updatePreview();
    showView('amount');
    el.grams.focus();
    el.grams.select();
  }

  function updatePreview() {
    const result = validateGrams(el.grams.value);
    const nutrients = result.ok ? scaleNutrients(sheet.selectedFood.per100g, result.value) : null;
    const show = (id, text) => { find(id).textContent = nutrients ? text : '–'; };

    show('#preview-kcal', nutrients && formatKcal(nutrients.kcal));
    show('#preview-protein', nutrients && `${formatGrams(nutrients.protein)} g`);
    show('#preview-carbs', nutrients && `${formatGrams(nutrients.carbs)} g`);
    show('#preview-fat', nutrients && `${formatGrams(nutrients.fat)} g`);
  }

  async function saveEntry(event) {
    event.preventDefault();
    const result = validateGrams(el.grams.value);
    setFieldError(el.amountForm, 'grams', result.ok ? '' : result.error);
    if (!result.ok) {
      el.grams.focus();
      return;
    }
    const entry = createEntryFromFood(sheet.selectedFood, result.value, {
      meal: el.amountForm.elements.meal.value,
      dayKey: getDayKey(),
    });
    try {
      await store.saveEntry(entry);
    } catch (error) {
      console.error(error);
      setFieldError(el.amountForm, 'grams', SAVE_FAILED);
      return;
    }
    dialog.close();
    onSaved();
  }

  // ---- Ansicht "new-food" --------------------------------------------------

  function openNewFood() {
    el.foodForm.reset();
    for (const field of FOOD_FIELDS) setFieldError(el.foodForm, field, '');
    el.foodFormError.textContent = '';
    el.foodForm.elements.name.value = el.search.value.trim();
    showView('new-food');
    const first = el.foodForm.elements.name.value ? 'kcal' : 'name';
    el.foodForm.elements[first].focus();
  }

  async function saveFood(event) {
    event.preventDefault();
    const input = Object.fromEntries(FOOD_FIELDS.map((f) => [f, el.foodForm.elements[f].value]));
    const result = validateFoodInput(input);

    for (const field of FOOD_FIELDS) setFieldError(el.foodForm, field, result.errors[field] ?? '');
    el.foodFormError.textContent = result.errors.form ?? '';
    if (!result.ok) {
      focusFirstError();
      return;
    }

    try {
      const food = await store.saveFood(createFood(result.value));
      sheet.foods.push(food);
      selectFood(food);
    } catch (error) {
      console.error(error);
      el.foodFormError.textContent = SAVE_FAILED;
    }
  }

  function focusFirstError() {
    const invalid = el.foodForm.querySelector('.field--invalid .field__input');
    (invalid ?? el.foodForm.elements.protein).focus();
  }

  // ---- Bausteine -----------------------------------------------------------

  function setMeal(mealId) {
    el.amountForm.elements.meal.value = mealId;
  }

  function bindEvents() {
    el.close.addEventListener('click', () => dialog.close());
    el.back.addEventListener('click', () => showView('pick'));
    el.search.addEventListener('input', renderFoodLists);
    el.newFoodButton.addEventListener('click', openNewFood);
    el.grams.addEventListener('input', updatePreview);
    el.amountForm.addEventListener('submit', saveEntry);
    el.foodForm.addEventListener('submit', saveFood);
    // Tippen auf den abgedunkelten Bereich schließt das Fenster
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  return { open };
}

/** Baut die vier Mahlzeit-Knöpfe aus MEALS (eine Quelle für alle Namen). */
function buildMealOptions(fieldset) {
  for (const meal of MEALS) {
    const label = document.createElement('label');
    label.className = 'segmented__option';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'meal';
    input.value = meal.id;

    const text = document.createElement('span');
    text.textContent = meal.shortLabel;

    label.append(input, text);
    fieldset.append(label);
  }
}

/** Zeigt oder entfernt die Fehlermeldung eines Feldes (data-field="…"). */
function setFieldError(form, fieldName, message) {
  const field = form.querySelector(`[data-field="${fieldName}"]`);
  if (!field) return;
  field.classList.toggle('field--invalid', message !== '');
  field.querySelector('.field__input').setAttribute('aria-invalid', String(message !== ''));
  field.querySelector('.field__error').textContent = message;
}
