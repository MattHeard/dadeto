export * from '../../commonCore.js';
import { ensureString as ensureStringCore } from '../../commonCore.js';

/**
 * Normalize an admin configuration value through the shared helper.
 * @param {unknown} value Candidate value.
 * @returns {string} Normalized string.
 */
export const ensureString = value => ensureStringCore(value);
