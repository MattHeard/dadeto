export { DEFAULT_BUCKET_NAME } from './common-core.js';

/**
 * Ensure a candidate dependency is callable before using it.
 * @param {unknown} candidate Value being validated.
 * @param {string} name Name of the dependency for error reporting.
 * @returns {void}
 */
export function assertFunction(candidate, name) {
  if (typeof candidate !== 'function') {
    throw new TypeError(`${name} must be a function`);
  }
}

/**
 * Origins that are permitted to access production endpoints.
 * Centralizes the allow list so every Cloud Function can reference
 * the same deployment configuration.
 */
export const productionOrigins = [
  'https://mattheard.net',
  'https://dendritestories.co.nz',
  'https://www.dendritestories.co.nz',
];
