/** @typedef {'input' | 'output'} ToySection */
/** @typedef {{order: ToySection[]}} ToyLayout */

/**
 * Create the logical order of a toy's sections. Input includes its controls.
 * @returns {ToyLayout} Initial layout state.
 */
export function createToyLayout() {
  return { order: ['input', 'output'] };
}

/**
 * Swap sections without mutating the previous layout state.
 * @param {ToyLayout} layout - Current logical layout.
 * @returns {ToyLayout} Next logical layout.
 */
export function swapToySections(layout) {
  return { ...layout, order: [...layout.order].reverse() };
}
