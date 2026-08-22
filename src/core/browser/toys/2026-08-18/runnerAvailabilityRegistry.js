// Toy: Runner Availability Registry
// (input, env) -> string

import { trimmedStringOrEmpty } from '../../validation.js';
import * as registryUtils from './registryUtils.js';

/**
 * Normalize a registry of runners and their available time windows.
 * @param {string} input JSON payload with `runners`.
 * @returns {string} Deterministic runner availability registry.
 */
export const runnerAvailabilityRegistry = input =>
  registryUtils.buildRegistry(input, {
    collectionKey: 'runners',
    countKey: 'runnerCount',
    sourceKey: 'runners',
    normalize: normalizeRunner,
    sortKey: runner => runner.runnerId,
  });

/**
 * @param {unknown} value Candidate runner.
 * @param {number} index Fallback index.
 * @returns {{runnerId: string, name: string, availability: Array<{from: string, to: string}>}|null} Normalized runner or null.
 */
function normalizeRunner(value, index) {
  if (value === null || Array.isArray(value)) return null;
  const runner = /** @type {Record<string, unknown>} */ (value);
  const runnerId =
    trimmedStringOrEmpty(runner.runnerId) || `runner-${index + 1}`;
  const name = trimmedStringOrEmpty(runner.name) || runnerId;
  const availability = Array.isArray(runner.availability)
    ? registryUtils.nonNullRecords(runner.availability.map(normalizeWindow))
    : [];
  return { runnerId, name, availability };
}

/**
 * @param {unknown} value Candidate availability window.
 * @returns {{from: string, to: string}|null} Normalized window or null.
 */
function normalizeWindow(value) {
  if (value === null || Array.isArray(value)) return null;
  const window = /** @type {Record<string, unknown>} */ (value);
  const from = trimmedStringOrEmpty(window.from);
  const to = trimmedStringOrEmpty(window.to);
  if (!from || !to) return null;
  return { from, to };
}
