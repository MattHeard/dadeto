import { parseJsonOrDefault } from './browser-core.js';

/**
 * Parse JSON and accept only non-array objects.
 * @param {string} input JSON text.
 * @returns {Record<string, unknown>} Parsed object or an empty object.
 */
export function parseJsonObjectOrDefault(input) {
  const parsed = parseJsonOrDefault(input, {});
  return /** @type {Record<string, unknown>} */ (
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {}
  );
}
