import { parseWgs84Coordinates } from '../logic/boundary/wgs84/coordinates.js';
import { calculateWgs84SurfaceDistance } from '../logic/core/wgs84/wgs84.js';
export { spherical } from '../logic/core/wgs84/wgs84.js';

/**
 * Compose public coordinate interpretation and trusted distance calculation.
 * @param {number|string} latitude1 First latitude.
 * @param {number|string} longitude1 First longitude.
 * @param {number|string} latitude2 Second latitude.
 * @param {number|string} longitude2 Second longitude.
 * @returns {number} Distance in meters.
 */
export function wgs84Distance(latitude1, longitude1, latitude2, longitude2) {
  const parsed = parseWgs84Coordinates(
    latitude1,
    longitude1,
    latitude2,
    longitude2
  );
  if (!parsed.ok) throw parsed.error;
  return calculateWgs84SurfaceDistance(...parsed.coordinates);
}
