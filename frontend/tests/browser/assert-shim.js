/**
 * Ersatz für "node:assert/strict" im Browser
 * ---------------------------------------------------------------------------
 * Nur die Prüfungen, die unsere Tests verwenden. Siehe node-test.js.
 */

class AssertionError extends Error {}

function fail(message) {
  throw new AssertionError(message);
}

function show(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isDeepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => Object.hasOwn(b, key) && isDeepEqual(a[key], b[key]));
}

const assert = {
  equal(actual, expected, message) {
    if (!Object.is(actual, expected)) fail(message ?? `erwartet ${show(expected)}, war ${show(actual)}`);
  },

  deepEqual(actual, expected, message) {
    if (!isDeepEqual(actual, expected)) fail(message ?? `erwartet ${show(expected)}, war ${show(actual)}`);
  },

  ok(value, message) {
    if (!value) fail(message ?? `erwartet einen wahren Wert, war ${show(value)}`);
  },

  match(text, pattern, message) {
    if (!pattern.test(text)) fail(message ?? `"${text}" passt nicht zu ${pattern}`);
  },

  throws(body, errorType, message) {
    try {
      body();
    } catch (error) {
      if (errorType && !(error instanceof errorType)) fail(message ?? `falscher Fehlertyp: ${error?.name}`);
      return;
    }
    fail(message ?? 'erwartet einen Fehler, aber es gab keinen');
  },

  async rejects(promiseOrBody, errorType, message) {
    try {
      await (typeof promiseOrBody === 'function' ? promiseOrBody() : promiseOrBody);
    } catch (error) {
      if (errorType && !(error instanceof errorType)) fail(message ?? `falscher Fehlertyp: ${error?.name}`);
      return;
    }
    fail(message ?? 'erwartet einen Fehler, aber es gab keinen');
  },
};

export default assert;
