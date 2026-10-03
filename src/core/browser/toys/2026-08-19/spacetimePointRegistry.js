// Toy: Spacetime Point Registry
// (input, env) -> string

import {
  buildRegistry,
  normalizeCoordinate,
  normalizeCoordinateRecord,
} from '../2026-08-18/registryUtils.js';
import { trimmedStringOrEmpty, normalizeUtcMinute } from '../../validation.js';

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
 * @returns {{pointId: string, latitude: string, longitude: string, timestamp: string}|null} Normalized point.
 */
function normalizePoint(value) {
  const point = /** @type {Record<string, unknown>} */ (value ?? {});
  const coordinates = normalizeCoordinateRecord(
    value,
    'pointId',
    Boolean(trimmedStringOrEmpty(point.spacePointId))
  );
  const pointId = coordinates?.id ?? '';
  const spacePointId = trimmedStringOrEmpty(point.spacePointId);
  const latitude = coordinates?.latitude ?? null;
  const longitude = coordinates?.longitude ?? null;
  const timestamp = normalizeUtcMinute(point.timestamp);
  if (!pointId || !timestamp || (latitude === null) !== (longitude === null)) {
    return null;
  }
  const normalized = {
    pointId,
    ...(spacePointId ? { spacePointId } : {}),
    ...(latitude === null ? {} : { latitude, longitude }),
    timestamp,
  };
  return /** @type {{pointId: string, latitude: string, longitude: string, timestamp: string}} */ (
    normalized
  );
}

export { normalizeCoordinate, normalizePoint, normalizeUtcMinute };
