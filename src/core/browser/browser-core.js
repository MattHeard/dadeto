import { safeParseJson, valueOr } from '../jsonUtils.js';

import { maybeRemoveElement } from './inputHandlers/disposeHelpers.js';
import { NUMBER_INPUT_SELECTOR } from '../constants/selectors.js';

export const createGoogleSignOut = ({
  authSignOut,
  storage,
  disableAutoSelect,
}) => {
  return async () => {
    await authSignOut();
    storage.removeItem('id_token');
    disableAutoSelect();
  };
};

/**
 * Return the current Google ID token stored in session storage.
 * @param {Storage} storage - Storage object that holds the token.
 * @returns {string|null} The stored ID token, or null when unset.
 */
export function getIdToken(storage = sessionStorage) {
  return storage.getItem('id_token');
}

/**
 * Safely parse a JSON string.
 * @param {string} input - JSON string to parse.
 * @returns {{ok: boolean, message?: string, data?: object}} Parsed result.
 */
export function safeJsonParse(input) {
  try {
    return { ok: true, data: JSON.parse(input) };
  } catch (parseError) {
    return {
      ok: false,
      message: `Error: Invalid JSON input. ${parseError.message}`,
    };
  }
}

/**
 * Parses JSON or returns a provided default when parsing fails.
 * @param {string} json - JSON string to parse.
 * @param {object} [fallback] - Default value when parsing fails.
 * @returns {object} Parsed object or fallback.
 */
export function parseJsonOrDefault(json, fallback = {}) {
  const parseJsonValue = x => JSON.parse(x);
  return valueOr(safeParseJson(json, parseJsonValue), fallback);
}

/**
 *
 * @param selector
 */
function createElementRemover(selector) {
  return (container, dom) => {
    const element = dom.querySelector(container, selector);
    maybeRemoveElement(element, container, dom);
  };
}

export const maybeRemoveNumber = createElementRemover(NUMBER_INPUT_SELECTOR);

const KV_CONTAINER_SELECTOR = '.kv-container';
export const maybeRemoveKV = createElementRemover(KV_CONTAINER_SELECTOR);

/**
 * Check if a value is a non-null object.
 * @param {*} value - Value to test.
 * @returns {boolean} True when the value is a non-null object.
 */
export function isNonNullObject(value) {
  return Boolean(value) && typeof value === 'object';
}

/**
 * Checks that two values are both not arrays.
 * @param {*} a - First value to inspect.
 * @param {*} b - Second value to inspect.
 * @returns {boolean} True when neither value is an array.
 */
function bothAreNotArrays(a, b) {
  return !Array.isArray(a) && !Array.isArray(b);
}

/**
 * Checks that two values are both non-null objects.
 * @param {*} a - First value to inspect.
 * @param {*} b - Second value to inspect.
 * @returns {boolean} True when both values are non-null objects.
 */
function bothAreNonNullObjects(a, b) {
  return isNonNullObject(a) && isNonNullObject(b);
}

/**
 * Determines whether two values should be merged recursively.
 * @param {*} targetValue - The destination value.
 * @param {*} sourceValue - The source value.
 * @returns {boolean} True when a deep merge should occur.
 */
function shouldDeepMerge(targetValue, sourceValue) {
  return (
    bothAreNonNullObjects(targetValue, sourceValue) &&
    bothAreNotArrays(targetValue, sourceValue)
  );
}

/**
 * Deeply merges two objects, producing a new object.
 * @param {object} target - Destination object.
 * @param {object} source - Source object to merge.
 * @returns {object} The merged object.
 */
export function deepMerge(target, source) {
  const output = { ...target };
  const mergeKey = key => {
    const targetValue = target[key];
    const sourceValue = source[key];
    if (shouldDeepMerge(targetValue, sourceValue)) {
      output[key] = deepMerge(targetValue, sourceValue);
    } else {
      output[key] = sourceValue;
    }
  };
  Object.keys(source).forEach(mergeKey);
  return output;
}

/**
 * Generates a disposer that removes an event listener.
 * @param {object} options - Parameters for the remover.
 * @param {object} options.dom - DOM helper utilities.
 * @param {EventTarget} options.el - The element to detach from.
 * @param {string} options.event - The event type to remove.
 * @param {Function} options.handler - The handler to detach.
 * @returns {Function} Disposer function removing the listener.
 */
export const createRemoveListener =
  ({ dom, el, event, handler }) =>
  () =>
    dom.removeEventListener(el, event, handler);
