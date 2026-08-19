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
import { parseObjectRecord } from '../../validation.js';

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
