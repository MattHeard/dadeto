// Toy: Spacetime Point Registry
// (input, env) -> string

import { buildRegistry } from '../2026-08-18/registryUtils.js';
import { trimmedStringOrEmpty } from '../../validation.js';

/**
 * Normalize opaque point IDs into canonical WGS84 coordinates and UTC-minute times.
 * @param {string} input JSON payload containing `points`.
 * @returns {string} Deterministic spacetime-point registry.
 */
export const spacetimePointRegistry = input =>
  buildRegistry(input, {
    collectionKey: 'points',
    countKey: 'pointCount',
    sourceKey: 'points',
    normalize: normalizePoint,
    sortKey: point => point.pointId,
  });

/**
 * @param {unknown} value Candidate point.
 * @returns {{pointId: string, latitude: number, longitude: number, timestamp: string}|null} Normalized point.
 */
function normalizePoint(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const point = /** @type {Record<string, unknown>} */ (value);
  const pointId = trimmedStringOrEmpty(point.pointId);
  const spacePointId = trimmedStringOrEmpty(point.spacePointId);
  const latitude = normalizeCoordinate(point.latitude, -90, 90);
  const longitude = normalizeCoordinate(point.longitude, -180, 180);
  const timestamp = normalizeUtcMinute(point.timestamp);
  if (
    !pointId ||
    (!spacePointId && (latitude === null || longitude === null)) ||
    (latitude === null) !== (longitude === null) ||
    !timestamp
  ) {
    return null;
  }
  const normalized = {
    pointId,
    ...(spacePointId ? { spacePointId } : {}),
    ...(latitude === null ? {} : { latitude, longitude }),
    timestamp,
  };
  return normalized;
}

/**
 * Normalize and round one bounded coordinate.
 * @param {unknown} value Candidate coordinate.
 * @param {number} minimum Inclusive lower bound.
 * @param {number} maximum Inclusive upper bound.
 * @returns {number|null} Rounded coordinate or null when invalid.
 */
function normalizeCoordinate(value, minimum, maximum) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  if (value < minimum || value > maximum) {
    return null;
  }
  return Number(value.toFixed(6));
}

/**
 * Normalize a UTC timestamp to minute precision.
 * @param {unknown} value Candidate timestamp.
 * @returns {string|null} Canonical timestamp or null when invalid.
 */
function normalizeUtcMinute(value) {
  const source = trimmedStringOrEmpty(value);
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})Z$/.exec(source);
  if (!match || Number.isNaN(Date.parse(`${match[1]}:00Z`))) return null;
  return `${match[1]}Z`;
}

export { normalizeCoordinate, normalizePoint, normalizeUtcMinute };
