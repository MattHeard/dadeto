import { resolveAllowedOrigins } from './cloud-core.js';

/**
 * Resolve allowed origins for the current deployment environment.
 * @param {Record<string, unknown> | null | undefined} environmentVariables Environment map.
 * @returns {string[]} Allowed origins list.
 */
export function getAllowedOrigins(environmentVariables) {
  return resolveAllowedOrigins(environmentVariables);
}
