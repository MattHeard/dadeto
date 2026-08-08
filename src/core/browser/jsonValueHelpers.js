import { parseJsonObject as parseJsonObjectCore } from './browser-core.js';

/**
 * Parse an object-valued JSON payload through the shared browser utility.
 * @param {string} input JSON text.
 * @returns {Record<string, unknown> | null} Parsed object or null.
 */
export const parseJsonObject = input => parseJsonObjectCore(input);
