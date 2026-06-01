/**
 * Generate a placeholder row where both the key and value span the full width.
 * @returns {string} Full width entry HTML.
 */
export function fullWidthElement() {
  return `<div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div><div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div>`;
}

/**
 * Create the full-width wrapper handle.
 * @returns {{ fullWidthElement: typeof fullWidthElement }} Full-width exports.
 */
export function createFullWidthHandle() {
  return { fullWidthElement };
}
