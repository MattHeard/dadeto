// Shared WGS84 inverse distance helper for environment-neutral core consumers.
const A = 6378137;
const F = 1 / 298.257223563;
const B = (1 - F) * A;

/**
 * Convert degrees to radians.
 * @param {number} degrees Degrees.
 * @returns {number} Radians.
 */
/**
 * Convert degrees to radians.
 * @param {number} degrees Degrees.
 * @returns {number} Radians.
 */
export const degreesToRadians = degrees => (degrees * Math.PI) / 180;

/** @typedef {{sigma: number, sinSigma: number, cosSigma: number, cosSqAlpha: number, cos2SigmaM: number, next: number}} LongitudeArc */

/**
 * Calculate WGS84 ellipsoid surface distance.
 * @param {number} latitude1 First latitude.
 * @param {number} longitude1 First longitude.
 * @param {number} latitude2 Second latitude.
 * @param {number} longitude2 Second longitude.
 * @returns {number} Distance in meters.
 */
export function calculateWgs84SurfaceDistance(
  latitude1,
  longitude1,
  latitude2,
  longitude2
) {
  const p1 = degreesToRadians(latitude1),
    p2 = degreesToRadians(latitude2),
    u1 = Math.atan((1 - F) * Math.tan(p1)),
    u2 = Math.atan((1 - F) * Math.tan(p2));
  const L = degreesToRadians(longitude2 - longitude1);
  let lambda = L;
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const outcome = calculateLongitudeStep(lambda, u1, u2, L);
    if (outcome.kind === 'coincident') return 0;
    const { arc } = outcome;
    if (hasLongitudeConverged(lambda, arc.next))
      return completeEllipsoidDistance(arc);
    lambda = arc.next;
  }
  return spherical(latitude1, longitude1, latitude2, longitude2);
}

/**
 * Prepare one finite-iteration arc, keeping the coincident singularity explicit.
 * @param {number} lambda Current longitude estimate.
 * @param {number} reducedLatitude1 First reduced latitude.
 * @param {number} reducedLatitude2 Second reduced latitude.
 * @param {number} L Original longitude difference.
 * @returns {{kind: 'coincident'} | {kind: 'iteration', arc: LongitudeArc}} Domain state and required arc data.
 */
export function calculateLongitudeStep(
  lambda,
  reducedLatitude1,
  reducedLatitude2,
  L
) {
  const su1 = Math.sin(reducedLatitude1),
    cu1 = Math.cos(reducedLatitude1),
    su2 = Math.sin(reducedLatitude2),
    cu2 = Math.cos(reducedLatitude2);
  const sl = Math.sin(lambda),
    cl = Math.cos(lambda);
  const sinSigma = Math.sqrt(
    (cu2 * sl) ** 2 + (cu1 * su2 - su1 * cu2 * cl) ** 2
  );
  if (sinSigma === 0) return { kind: 'coincident' };
  const cosSigma = su1 * su2 + cu1 * cu2 * cl;
  const sigma = Math.atan2(sinSigma, cosSigma);
  const sinAlpha = (cu1 * cu2 * sl) / sinSigma;
  const cosSqAlpha = 1 - sinAlpha ** 2;
  const cos2SigmaM =
    cosSqAlpha === 0 ? 0 : cosSigma - (2 * su1 * su2) / cosSqAlpha;
  const C = (F / 16) * cosSqAlpha * (4 + F * (4 - 3 * cosSqAlpha));
  const next =
    L +
    (1 - C) *
      F *
      sinAlpha *
      (sigma +
        C *
          sinSigma *
          (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM ** 2)));
  return {
    kind: 'iteration',
    arc: { sigma, sinSigma, cosSigma, cosSqAlpha, cos2SigmaM, next },
  };
}

/**
 * Apply the original strict longitude convergence tolerance.
 * @param {number} previous Previous longitude estimate.
 * @param {number} next Next longitude estimate.
 * @returns {boolean} Whether the numerical domain tolerance is satisfied.
 */
export function hasLongitudeConverged(previous, next) {
  return Math.abs(next - previous) < 1e-12;
}

/**
 * Calculate ellipsoid distance only from a converged, non-coincident arc.
 * @param {LongitudeArc} arc Required iteration measurements.
 * @returns {number} Distance in meters.
 */
function completeEllipsoidDistance(arc) {
  const { sigma, cosSqAlpha } = arc;
  const uSq = (cosSqAlpha * (A ** 2 - B ** 2)) / B ** 2;
  const ca =
    1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const cb = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  return B * ca * (sigma - calculateArcCorrection(arc, cb));
}

/**
 * Calculate the converged arc correction independently of its ellipsoid scale.
 * @param {LongitudeArc} arc Required angular measurements.
 * @param {number} cb Ellipsoid correction coefficient.
 * @returns {number} Correction to the spherical arc.
 */
function calculateArcCorrection(arc, cb) {
  const { sinSigma, cosSigma, cos2SigmaM } = arc;
  return (
    cb *
    sinSigma *
    (cosSigma -
      (cb / 4) *
        (cosSigma * (-1 + 2 * cos2SigmaM ** 2) -
          (cb / 6) *
            cos2SigmaM *
            (-3 + 4 * sinSigma ** 2) *
            (-3 + 4 * cos2SigmaM ** 2)))
  );
}

/**
 * Calculate a spherical WGS84 approximation.
 * @param {number} lat1 First latitude.
 * @param {number} lon1 First longitude.
 * @param {number} lat2 Second latitude.
 * @param {number} lon2 Second longitude.
 * @returns {number} Distance in meters.
 */
export function spherical(lat1, lon1, lat2, lon2) {
  const dp = degreesToRadians(lat2 - lat1),
    dl = degreesToRadians(lon2 - lon1);
  const h =
    Math.sin(dp / 2) ** 2 +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dl / 2) ** 2;
  return A * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
