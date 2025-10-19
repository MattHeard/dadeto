const inputValueStore = new WeakMap();

/**
 * Store the latest input value for a given element.
 * @param {HTMLElement} element - Input element acting as the key.
 * @param {string|number|boolean|null|undefined} value - Value to store.
 */
export const setInputValue = (element, value) => {
  if (!element) {
    return;
  }
  const normalized = value == null ? '' : String(value);
  inputValueStore.set(element, normalized);
};

/**
 * Retrieve the stored value for an element, falling back to the element's value property.
 * @param {HTMLElement} element - Input element to look up.
 * @returns {string} The stored value or element.value when absent.
 */
export const getInputValue = element => {
  if (!element) {
    return '';
  }
  if (inputValueStore.has(element)) {
    return inputValueStore.get(element);
  }
  return element.value ?? '';
};

/**
 * Determine whether a value exists for the provided element.
 * @param {HTMLElement} element - Input element to check.
 * @returns {boolean} True when a stored value exists.
 */
export const hasInputValue = element => inputValueStore.has(element);

/**
 * Remove any stored value for the provided element.
 * @param {HTMLElement} element - Input element whose stored value should be cleared.
 */
export const clearInputValue = element => {
  if (!element) {
    return;
  }
  inputValueStore.delete(element);
};
