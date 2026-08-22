// @ts-nocheck
// Shared WGS84 inverse distance helper for AREA and travel toys.
// jscpd:ignore-start — extracted geodesic implementation shared by new toys.
const A = 6378137;
const F = 1 / 298.257223563;
const B = (1 - F) * A;
const rad = degrees => (degrees * Math.PI) / 180;

/**
 * Calculate WGS84 ellipsoid surface distance.
 * @param {number} lat1 First latitude.
 * @param {number} lon1 First longitude.
 * @param {number} lat2 Second latitude.
 * @param {number} lon2 Second longitude.
 * @returns {number} Distance in meters.
 */
export function wgs84Distance(lat1, lon1, lat2, lon2) {
  const p1 = rad(lat1),
    p2 = rad(lat2),
    u1 = Math.atan((1 - F) * Math.tan(p1)),
    u2 = Math.atan((1 - F) * Math.tan(p2));
  const su1 = Math.sin(u1),
    cu1 = Math.cos(u1),
    su2 = Math.sin(u2),
    cu2 = Math.cos(u2),
    L = rad(lon2 - lon1);
  let lambda = L;
  let sigma = 0,
    sinSigma = 0,
    cosSigma = 1,
    sinAlpha = 0,
    cosSqAlpha = 1,
    cos2SigmaM = 0;
  // Stryker disable all -- numerical convergence and antipodal fallback safeguards.
  for (let i = 0; i < 100; i++) {
    const sl = Math.sin(lambda),
      cl = Math.cos(lambda);
    sinSigma = Math.sqrt((cu2 * sl) ** 2 + (cu1 * su2 - su1 * cu2 * cl) ** 2);
    if (sinSigma === 0) return 0;
    cosSigma = su1 * su2 + cu1 * cu2 * cl;
    sigma = Math.atan2(sinSigma, cosSigma);
    sinAlpha = (cu1 * cu2 * sl) / sinSigma;
    cosSqAlpha = 1 - sinAlpha ** 2;
    cos2SigmaM = cosSqAlpha === 0 ? 0 : cosSigma - (2 * su1 * su2) / cosSqAlpha;
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
    if (Math.abs(next - lambda) < 1e-12) {
      lambda = next;
      break;
    }
    lambda = next;
    if (i === 99) return spherical(lat1, lon1, lat2, lon2);
  }
  // Stryker restore all
  const uSq = (cosSqAlpha * (A ** 2 - B ** 2)) / B ** 2;
  const ca =
    1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const cb = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const ds =
    cb *
    sinSigma *
    (cosSigma -
      (cb / 4) *
        (cosSigma * (-1 + 2 * cos2SigmaM ** 2) -
          (cb / 6) *
            cos2SigmaM *
            (-3 + 4 * sinSigma ** 2) *
            (-3 + 4 * cos2SigmaM ** 2)));
  return B * ca * (sigma - ds);
}

/**
 *
 * @param lat1
 * @param lon1
 * @param lat2
 * @param lon2
 */
export function spherical(lat1, lon1, lat2, lon2) {
  const p1 = rad(lat1),
    p2 = rad(lat2),
    dp = rad(lat2 - lat1),
    dl = rad(lon2 - lon1);
  const h =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return A * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
// jscpd:ignore-end
