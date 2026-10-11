// Toy: Space Point Registry

import {
  normalizeCoordinateRecord,
  normalizeRegistryCollection,
  serializeRegistry,
} from '../2026-08-18/registryUtils.js';

/**
 * @param {string} input JSON payload containing spacePoints.
 * @returns {string} Deterministic atemporal space-point registry.
 */
export const spacePointRegistry = input =>
  serializeRegistry(
    'spacePoints',
    normalizeRegistryCollection(
      input,
      'spacePoints',
      normalize,
      point => point.spacePointId
    ),
    'spacePointCount'
  );

/**
 * @param {unknown} value Candidate space point.
 * @returns {{spacePointId: string, latitude: string, longitude: string}|null} Normalized space point.
 */
function normalize(value) {
  const coordinates = normalizeCoordinateRecord(value, 'spacePointId');
  return coordinates
    ? {
        spacePointId: coordinates.id,
        latitude: /** @type {string} */ (coordinates.latitude),
        longitude: /** @type {string} */ (coordinates.longitude),
      }
    : null;
}
