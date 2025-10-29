export { DEFAULT_BUCKET_NAME } from './common-core.js';

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
