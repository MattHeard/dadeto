// Toy: Space Point Registry

import {
  buildRegistry,
  normalizeCoordinateRecord,
} from '../2026-08-18/registryUtils.js';

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
  const coordinates = normalizeCoordinateRecord(value, 'spacePointId');
  return coordinates
    ? {
        spacePointId: coordinates.id,
        latitude: /** @type {number} */ (coordinates.latitude),
        longitude: /** @type {number} */ (coordinates.longitude),
      }
    : null;
}
