export * from '../../commonCore.js';
import { ensureString as ensureStringCore } from '../../commonCore.js';

/**
 * Normalize a configuration value through the shared common helper.
 * @param {unknown} value Candidate value.
 * @returns {string} Normalized string.
 */
export const ensureString = value => ensureStringCore(value);
