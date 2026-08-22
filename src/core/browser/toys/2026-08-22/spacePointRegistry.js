// Toy: Space Point Registry

import { buildRegistry } from '../2026-08-18/registryUtils.js';
import { trimmedStringOrEmpty } from '../../validation.js';

/**
 * @param {string} input JSON payload containing spacePoints.
 * @returns {string} Deterministic atemporal space-point registry.
 */
export const spacePointRegistry = input =>
  buildRegistry(input, {
    collectionKey: 'spacePoints',
    countKey: 'spacePointCount',
    sourceKey: 'spacePoints',
    normalize,
    sortKey: point => point.spacePointId,
  });

/**
 * @param {unknown} value Candidate space point.
 * @returns {{spacePointId: string, latitude: number, longitude: number}|null} Normalized space point.
 */
function normalize(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const point = /** @type {Record<string, unknown>} */ (value);
  const spacePointId = trimmedStringOrEmpty(point.spacePointId);
  const latitude = coordinate(point.latitude, -90, 90);
  const longitude = coordinate(point.longitude, -180, 180);
  return spacePointId && latitude !== null && longitude !== null
    ? { spacePointId, latitude, longitude }
    : null;
}

/**
 *
 * @param value
 * @param minimum
 * @param maximum
 */
/**
 * @param {unknown} value Candidate coordinate.
 * @param {number} minimum Inclusive minimum.
 * @param {number} maximum Inclusive maximum.
 * @returns {number|null} Normalized coordinate.
 */
function coordinate(value, minimum, maximum) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  )
    return null;
  return Number(value.toFixed(6));
}
