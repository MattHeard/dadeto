import { parseJsonOrNull } from '../commonCore.js';

/**
 * Return the value when it is a finite number; otherwise use the fallback.
 * @param {unknown} value Candidate value.
 * @param {number} fallback Fallback number.
 * @returns {number} Normalized number.
 */
export function numberOr(value, fallback) {
  return valueOrFallback(
    value,
    fallback,
    candidate => typeof candidate === 'number' && Number.isFinite(candidate)
  );
}

/**
 * Return the value when it is a non-empty string; otherwise use the fallback.
 * @param {unknown} value Candidate value.
 * @param {string} fallback Fallback string.
 * @returns {string} Normalized string.
 */
export function stringOr(value, fallback) {
  return valueOrFallback(
    value,
    fallback,
    candidate => typeof candidate === 'string' && candidate.length > 0
  );
}

/**
 * Return the candidate when it passes the predicate; otherwise use the fallback.
 * @template T
 * @param {unknown} candidate Candidate value.
 * @param {T} fallback Fallback value.
 * @param {(candidate: unknown) => boolean} isValid Predicate for the candidate.
 * @returns {T} Normalized value.
 */
function valueOrFallback(candidate, fallback, isValid) {
  if (isValid(candidate)) {
    return /** @type {T} */ (candidate);
  }

  return fallback;
}

/**
 * Parse a JSON string into a plain object payload or null.
 * @template T
 * @param {string} inputString JSON input.
 * @param {(payload: Record<string, unknown>) => T} mapPayload Payload mapper.
 * @returns {T | null} Parsed and mapped payload or null.
 */
export function parseObjectPayload(inputString, mapPayload) {
  const parsed = parseJsonOrNull(inputString);
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  return mapPayload(/** @type {Record<string, unknown>} */ (parsed));
}
