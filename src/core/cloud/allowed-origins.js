import { resolveAllowedOrigins } from './cloud-core.js';

/**
 * Resolve allowed origins for the current deployment environment.
 * @param {import('../../../types/allow-effects').AllowEffects} allowEffects Permission for diagnostics.
 * @param {Record<string, unknown> | null | undefined} environmentVariables Environment map.
 * @param {(permission: import('../../../types/allow-effects').AllowEffects, ...values: unknown[]) => void} logDebug Permission-aware diagnostic adapter.
 * @returns {string[]} Allowed origins list.
 */
export function getAllowedOrigins(
  allowEffects,
  environmentVariables,
  logDebug
) {
  return resolveAllowedOrigins(allowEffects, environmentVariables, logDebug);
}
