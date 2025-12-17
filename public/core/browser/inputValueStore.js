/**
 * Object keys that expose a `value` property used for normalization and storage.
 * @typedef {object & { value?: string }} ElementWithValue
 */

/** @type {WeakMap<ElementWithValue, string>} */
const inputValueStore = new WeakMap();

/**
 * Normalize user input into a persisted string form.
 * @param {string|number|boolean|null|undefined} value - Raw input value.
 * @returns {string} A string representation that treats nullish as empty.
 */
function normalizeInputValue(value) {
  return String(value ?? '');
}

/**
 * Resolve the stored value for an element or fall back to its live value.
 * @param {ElementWithValue} element - Input element acting as the key.
 * @returns {string} Stored value when present otherwise the normalized live value.
 */
export function readStoredOrElementValue(element) {
  return inputValueStore.get(element) ?? normalizeInputValue(element.value);
}

/**
 * Store the latest input value for a given element.
 * @param {ElementWithValue | null | undefined} element - Input element acting as the key.
 * @param {string|number|boolean|null|undefined} value - Value to store.
 */
export function setInputValue(element, value) {
  if (!element) {
    return;
  }
  inputValueStore.set(element, normalizeInputValue(value));
}

/**
 * Determine whether a value exists for the provided element.
 * @param {ElementWithValue} element - Input element to check.
 * @returns {boolean} True when a stored value exists.
 */
export const hasInputValue = element => inputValueStore.has(element);

/**
 * Remove any stored value for the provided element.
 * @param {ElementWithValue | null | undefined} element - Input element whose stored value should be cleared.
 */
export const clearInputValue = element => {
  if (!element) {
    return;
  }
  inputValueStore.delete(element);
};
