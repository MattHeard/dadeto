// Toy: Spacetime Segment Geodesic Length
// (input, env) -> string
// jscpd:ignore-start
import { resolvePointRecords } from '../2026-08-22/spacePointResolution.js';

const SEMI_MAJOR_AXIS = 6378137;
const FLATTENING = 1 / 298.257223563;
const SEMI_MINOR_AXIS = (1 - FLATTENING) * SEMI_MAJOR_AXIS;

/**
 * Calculate WGS84 surface length for a SPAC2 segment.
 * @param {string} input JSON payload containing points and a segment.
 * @returns {string} Object containing string value and unit fields.
 */
export function spacetimeSegmentGeodesicLength(input) {
  try {
    const { points, segment } = parseInput(input);
    const byId = new Map(points.map(point => [point.pointId, point]));
    const start = byId.get(segment.startPointId);
    const end = byId.get(segment.endPointId);
    if (!start || !end) throw new Error('Segment references an unknown point.');
    const distance = vincentyDistance(
      start.latitude,
      start.longitude,
      end.latitude,
      end.longitude
    );
    return JSON.stringify({ value: distance.toFixed(2), unit: 'meters' });
  } catch (error) {
    return JSON.stringify({
      valid: false,
      error: error.message,
    });
  }
}

/**
 *
 * @param input
 */
/**
 * Parse the point and segment payload.
 * @param {string} input Raw JSON input.
 * @returns {{points: Array<{pointId: string, latitude: string, longitude: string}>, segment: {startPointId: string, endPointId: string}}} Parsed payload.
 */
function parseInput(input) {
  const parsed = JSON.parse(input);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Input must be a JSON object.');
  }
  if (!Array.isArray(parsed.points) || !parsed.segment) {
    throw new Error('points and segment are required.');
  }
  return {
    points:
      /** @type {Array<{pointId: string, latitude: string, longitude: string}>} */ (
        resolvePointRecords(parsed.points, parsed.spacePoints)
      ),
    segment: /** @type {{startPointId: string, endPointId: string}} */ (
      parsed.segment
    ),
  };
}

/**
 * Calculate inverse geodesic distance on the WGS84 ellipsoid.
 * @param {number} firstLatitude First latitude.
 * @param {number} firstLongitude First longitude.
 * @param {number} secondLatitude Second latitude.
 * @param {number} secondLongitude Second longitude.
 * @returns {number} Distance in meters.
 */
function vincentyDistance(
  firstLatitude,
  firstLongitude,
  secondLatitude,
  secondLongitude
) {
  const phi1 = radians(firstLatitude);
  const phi2 = radians(secondLatitude);
  const reduced1 = Math.atan((1 - FLATTENING) * Math.tan(phi1));
  const reduced2 = Math.atan((1 - FLATTENING) * Math.tan(phi2));
  const sinReduced1 = Math.sin(reduced1);
  const cosReduced1 = Math.cos(reduced1);
  const sinReduced2 = Math.sin(reduced2);
  const cosReduced2 = Math.cos(reduced2);
  const longitudeDifference = radians(secondLongitude - firstLongitude);
  let lambda = longitudeDifference;
  let previousLambda;
  let sinSigma = 0,
    cosSigma = 1,
    sigma = 0,
    sinAlpha = 0,
    cosSquaredAlpha = 1,
    cosTwoSigmaM = 0;
  for (let iteration = 0; iteration < 100; iteration++) {
    const sinLambda = Math.sin(lambda);
    const cosLambda = Math.cos(lambda);
    sinSigma = Math.sqrt(
      (cosReduced2 * sinLambda) ** 2 +
        (cosReduced1 * sinReduced2 - sinReduced1 * cosReduced2 * cosLambda) ** 2
    );
    if (sinSigma === 0) return 0;
    cosSigma =
      sinReduced1 * sinReduced2 + cosReduced1 * cosReduced2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);
    sinAlpha = (cosReduced1 * cosReduced2 * sinLambda) / sinSigma;
    cosSquaredAlpha = 1 - sinAlpha ** 2;
    cosTwoSigmaM =
      cosSquaredAlpha === 0
        ? 0
        : cosSigma - (2 * sinReduced1 * sinReduced2) / cosSquaredAlpha;
    const coefficient =
      (FLATTENING / 16) *
      cosSquaredAlpha *
      (4 + FLATTENING * (4 - 3 * cosSquaredAlpha));
    previousLambda = lambda;
    lambda =
      longitudeDifference +
      (1 - coefficient) *
        FLATTENING *
        sinAlpha *
        (sigma +
          coefficient *
            sinSigma *
            (cosTwoSigmaM +
              coefficient * cosSigma * (-1 + 2 * cosTwoSigmaM ** 2)));
    if (Math.abs(lambda - previousLambda) < 1e-12) break;
    if (iteration === 99)
      return sphericalFallback(
        firstLatitude,
        firstLongitude,
        secondLatitude,
        secondLongitude
      );
  }
  const uSquared =
    (cosSquaredAlpha * (SEMI_MAJOR_AXIS ** 2 - SEMI_MINOR_AXIS ** 2)) /
    SEMI_MINOR_AXIS ** 2;
  const coefficientA =
    1 +
    (uSquared / 16384) *
      (4096 + uSquared * (-768 + uSquared * (320 - 175 * uSquared)));
  const coefficientB =
    (uSquared / 1024) *
    (256 + uSquared * (-128 + uSquared * (74 - 47 * uSquared)));
  const deltaSigma =
    coefficientB *
    sinSigma *
    (cosSigma -
      (coefficientB / 4) *
        (cosSigma * (-1 + 2 * cosTwoSigmaM ** 2) -
          (coefficientB / 6) *
            cosTwoSigmaM *
            (-3 + 4 * sinSigma ** 2) *
            (-3 + 4 * cosTwoSigmaM ** 2)));
  return SEMI_MINOR_AXIS * coefficientA * (sigma - deltaSigma);
}

/**
 * Calculate a spherical fallback distance for non-convergent ellipsoid cases.
 * @param {number} firstLatitude First latitude.
 * @param {number} firstLongitude First longitude.
 * @param {number} secondLatitude Second latitude.
 * @param {number} secondLongitude Second longitude.
 * @returns {number} Approximate distance in meters.
 */
function sphericalFallback(
  firstLatitude,
  firstLongitude,
  secondLatitude,
  secondLongitude
) {
  const phi1 = radians(firstLatitude);
  const phi2 = radians(secondLatitude);
  const deltaPhi = radians(secondLatitude - firstLatitude);
  const deltaLambda = radians(secondLongitude - firstLongitude);
  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return SEMI_MAJOR_AXIS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Convert degrees to radians.
 * @param {number} degrees Degrees.
 * @returns {number} Radians.
 */
const radians = degrees => (degrees * Math.PI) / 180;
// jscpd:ignore-end
