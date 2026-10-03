// Shared helpers for deterministic registry toys.

// Registry serializer contract begins here.
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
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const point = /** @type {Record<string, unknown>} */ (value);
  const id = trimmedStringOrEmpty(point[idKey]);
  const { latitude, longitude } = normalizeSpatialCoordinates(point);
  return id &&
    ((latitude !== null && longitude !== null) || allowMissingCoordinates)
    ? { id, latitude, longitude }
    : null;
}

/**
 * Normalize and round one bounded coordinate.
 * @param {unknown} value Candidate coordinate.
 * @param {number} minimum Inclusive lower bound.
 * @param {number} maximum Inclusive upper bound.
 * @returns {string|null} Canonical decimal coordinate or null when invalid.
 */
export function normalizeCoordinate(value, minimum, maximum) {
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
/**
 * Normalize a WGS84 latitude/longitude pair using the registry bounds policy.
 * @param {Record<string, unknown>} point Coordinate-bearing spatial record.
 * @returns {{latitude: string | null, longitude: string | null}} Canonical spatial coordinates.
 */
export function normalizeSpatialCoordinates(point) {
  return {
    latitude: normalizeCoordinate(point.latitude, -90, 90),
    longitude: normalizeCoordinate(point.longitude, -180, 180),
  };
}

/**
 * Normalize ordered segments that reference SPAC1 points.
 * @param {string} input JSON payload containing `segments`.
 * @returns {string} Deterministic spacetime-segment registry.
 */
export const spacetimeSegmentRegistry = input =>
  buildRegistry(input, {
    collectionKey: 'segments',
    countKey: 'segmentCount',
    sourceKey: 'segments',
    normalize: normalizeSegment,
    sortKey: segment => segment.segmentId,
  });

/**
 * @param {unknown} value Candidate segment.
 * @returns {{segmentId: string, startPointId: string, endPointId: string}|null} Normalized segment.
 */
export function normalizeSegment(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const segment = /** @type {Record<string, unknown>} */ (value);
  const segmentId = trimmedStringOrEmpty(segment.segmentId);
  const startPointId = trimmedStringOrEmpty(segment.startPointId);
  const endPointId = trimmedStringOrEmpty(segment.endPointId);
  if (!segmentId || !startPointId || !endPointId) return null;
  return createSegmentRecord(segmentId, startPointId, endPointId);
}

/**
 * Construct an ordered segment without coercing its caller-owned identifiers.
 * @param {string} segmentId Segment identifier.
 * @param {string} startPointId Starting point identifier.
 * @param {string} endPointId Ending point identifier.
 * @returns {{segmentId: string, startPointId: string, endPointId: string}} Segment record.
 */
export function createSegmentRecord(segmentId, startPointId, endPointId) {
  return { segmentId, startPointId, endPointId };
}

/**
 * Build a normalized possession-context registry.
 * @param {string} input JSON payload containing possessionContexts.
 * @returns {string} Deterministic registry.
 */
export const possessionContextRegistry = input =>
  buildRegistry(input, {
    collectionKey: 'possessionContexts',
    countKey: 'possessionContextCount',
    sourceKey: 'possessionContexts',
    normalize: normalizePossessionContext,
    sortKey: context => context.possessionContextId,
  });

/**
 * Normalize one possession context.
 * @param {unknown} value Candidate record.
 * @returns {{possessionContextId: string, sku: string, segmentId: string}|null} Normalized record or null.
 */
function normalizePossessionContext(value) {
  const x = /** @type {Record<string, unknown>} */ (value || {});
  const possessionContextId = trimmedStringOrEmpty(x.possessionContextId),
    sku = trimmedStringOrEmpty(x.sku),
    segmentId = trimmedStringOrEmpty(x.segmentId);
  return possessionContextId && sku && segmentId
    ? { possessionContextId, sku, segmentId }
    : null;
}
