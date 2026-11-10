/**
 * Escape a trusted string for a double-quoted HTML attribute.
 * @param {string} value Interpreted text.
 * @returns {string} Escaped attribute contents.
 */
export function escapeStaticJsonlAttribute(value) {
  const entities = /** @type {Record<string, string>} */ ({
    '&': '&amp;',
    '"': '&quot;',
    '<': '&lt;',
    '>': '&gt;',
  });
  return value.replace(/[&"<>]/g, character => entities[character]);
}

/**
 * Escape a trusted string for an HTML text node.
 * @param {string} value Interpreted text.
 * @returns {string} Escaped text contents.
 */
export function escapeStaticJsonlText(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
