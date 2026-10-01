import { calculateWgs84SurfaceDistance } from './wgs84.js';
export { spherical } from './wgs84.js';

/**
 * Parse public coordinates before calculating ellipsoid surface distance.
 * @param {number|string} lat1 First latitude.
 * @param {number|string} lon1 First longitude.
 * @param {number|string} lat2 Second latitude.
 * @param {number|string} lon2 Second longitude.
 * @returns {number} Distance in meters.
 */
export function wgs84Distance(lat1, lon1, lat2, lon2) {
  return calculateWgs84SurfaceDistance(
    Number(lat1),
    Number(lon1),
    Number(lat2),
    Number(lon2)
  );
}
