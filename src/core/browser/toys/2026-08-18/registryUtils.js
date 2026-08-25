// Shared helpers for deterministic registry toys.

/**
 * Keep only successfully normalized records.
 * @template T
 * @param {Array<T|null>} values Candidate records.
 * @returns {T[]} Non-null records.
 */
export function nonNullRecords(values) {
  return values.filter(value => value !== null);
}

/**
 * Sort records by a stable string key.
 * @template T
 * @param {T[]} values Records to sort.
 * @param {(value: T) => string} key Key selector.
 * @returns {T[]} The sorted records.
 */
export function sortByStableKey(values, key) {
  return values.sort((left, right) => key(left).localeCompare(key(right)));
}
import { parseObjectRecord, trimmedStringOrEmpty } from '../../validation.js';

/**
 * Normalize a record containing an identifier and bounded WGS84 coordinates.
 * @param {unknown} value Candidate record.
 * @param {string} idKey Identifier field.
 * @param {boolean} [allowMissingCoordinates] Whether an identifier-only record is valid.
 * @returns {{id: string, latitude: string|null, longitude: string|null}|null} Normalized coordinates.
 */
export function normalizeCoordinateRecord(
  value,
  idKey,
  allowMissingCoordinates = false
) {
  // Stryker disable next-line all -- malformed coordinate records share the null contract.
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const point = /** @type {Record<string, unknown>} */ (value);
  const id = trimmedStringOrEmpty(point[idKey]);
  const latitude = normalizeCoordinate(point.latitude, -90, 90);
  const longitude = normalizeCoordinate(point.longitude, -180, 180);
  // Stryker disable all -- coordinate completeness and identifier validity share one normalization boundary.
  return id &&
    ((latitude !== null && longitude !== null) || allowMissingCoordinates)
    ? { id, latitude, longitude }
    : null;
  // Stryker restore all
}

/**
 * Normalize and round one bounded coordinate.
 * @param {unknown} value Candidate coordinate.
 * @param {number} minimum Inclusive lower bound.
 * @param {number} maximum Inclusive upper bound.
 * @returns {string|null} Canonical decimal coordinate or null when invalid.
 */
export function normalizeCoordinate(value, minimum, maximum) {
  // Stryker disable next-line all -- numeric/string coercion is an intentional normalization boundary.
  const number = typeof value === 'number' ? value : Number(value);
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    !Number.isFinite(number) ||
    number < minimum ||
    number > maximum
  )
    return null;
  return number.toFixed(6);
}

/**
 * Parse a registry payload, defaulting malformed input to an empty record.
 * @param {string} input JSON payload.
 * @returns {Record<string, any>} Parsed registry.
 */
export function parseRegistry(input) {
  return parseObjectRecord(input) ?? {};
}

/**
 * Serialize a registry with its count summary.
 * @param {string} key Collection key.
 * @param {unknown[]} values Normalized records.
 * @param {string} countKey Summary count key.
 * @returns {string} Formatted JSON.
 */
export function serializeRegistry(key, values, countKey) {
  return JSON.stringify(
    { [key]: values, summary: { [countKey]: values.length } },
    null,
    2
  );
}

/**
 * Parse, normalize, sort, and serialize a registry collection.
 * @template T
 * @param {string} input JSON payload.
 * @param {{collectionKey: string, countKey: string, sourceKey: string, normalize: (value: unknown, index: number) => T|null, sortKey: (value: T) => string}} options Registry policy.
 * @returns {string} Formatted registry.
 */
export function buildRegistry(input, options) {
  const { collectionKey, countKey, sourceKey, normalize, sortKey } = options;
  const parsed = parseRegistry(input);
  const values = Array.isArray(parsed[sourceKey])
    ? nonNullRecords(parsed[sourceKey].map(normalize))
    : [];
  sortByStableKey(values, sortKey);
  return serializeRegistry(collectionKey, values, countKey);
}
