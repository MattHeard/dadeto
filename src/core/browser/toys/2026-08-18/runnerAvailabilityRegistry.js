// Toy: Runner Availability Registry
// (input, env) -> string

import { parseObjectRecord, trimmedStringOrEmpty } from '../../validation.js';

/**
 * Normalize a registry of runners and their available time windows.
 * @param {string} input JSON payload with `runners`.
 * @returns {string} Deterministic runner availability registry.
 */
export function runnerAvailabilityRegistry(input) {
  const parsed = parseObjectRecord(input) ?? {};
  const runners = Array.isArray(parsed.runners)
    ? parsed.runners.map(normalizeRunner).filter(Boolean)
    : [];
  runners.sort((left, right) => left.runnerId.localeCompare(right.runnerId));
  return JSON.stringify({ runners, summary: { runnerCount: runners.length } }, null, 2);
}

/**
 * @param {unknown} value Candidate runner.
 * @param {number} index Fallback index.
 * @returns {{runnerId: string, name: string, availability: Array<{from: string, to: string}>}|null}
 */
function normalizeRunner(value, index) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const runner = /** @type {Record<string, unknown>} */ (value);
  const runnerId = trimmedStringOrEmpty(runner.runnerId) || `runner-${index + 1}`;
  const name = trimmedStringOrEmpty(runner.name) || runnerId;
  const availability = Array.isArray(runner.availability)
    ? runner.availability.map(normalizeWindow).filter(Boolean)
    : [];
  return { runnerId, name, availability };
}

/**
 * @param {unknown} value Candidate availability window.
 * @returns {{from: string, to: string}|null}
 */
function normalizeWindow(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const window = /** @type {Record<string, unknown>} */ (value);
  const from = trimmedStringOrEmpty(window.from);
  const to = trimmedStringOrEmpty(window.to);
  if (!from || !to) return null;
  return { from, to };
}
