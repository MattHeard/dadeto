import { parseJsonOrNull as parseJsonOrNullCore } from '../commonCore.js';

/**
 * Parse JSON through the shared browser-facing utility.
 * @param {string} value JSON text.
 * @returns {unknown} Parsed value or null when parsing fails.
 */
export const parseJsonOrNull = value => parseJsonOrNullCore(value);
