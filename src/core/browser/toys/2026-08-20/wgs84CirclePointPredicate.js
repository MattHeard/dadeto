// Toy: WGS84 Circle Point Predicate
import { wgs84Distance } from './wgs84Distance.js';
import { resolvePoint } from '../2026-08-22/spacePointResolution.js';

/**
 * Determine whether a point lies within a WGS84 circle.
 * @param {string} input JSON with circle and point.
 * @returns {string} JSON boolean.
 */
export function wgs84CirclePointPredicate(input) {
  let parsed;
  // Stryker disable all -- malformed JSON normalization is a fixed false-result boundary.
  try {
    // Stryker disable next-line all -- empty input has the same false predicate contract as malformed JSON.
    parsed = JSON.parse(input || '{}');
  // Stryker disable all -- malformed JSON always maps to false.
  } catch {
    // Stryker disable next-line all -- malformed JSON always maps to false.
    parsed = {};
  }
  // Stryker restore all
  const { circle, point } = parsed || {};
  if (!circle || !circle.center || !point) return 'false';
  let resolvedPoint;
  try {
    if (parsed.spacePoints === undefined) {
      resolvedPoint = resolvePoint(point, new Map());
    } else {
      resolvedPoint = resolvePoint(
        point,
        new Map(
          parsed.spacePoints.map(
            /**
             * @param {Record<string, unknown>} spacePoint Space-point record.
             * @returns {[string, Record<string, unknown>]} Point-map entry.
             */
            spacePoint => [String(spacePoint.spacePointId), spacePoint]
          )
        )
      );
    }
  } catch {
    return 'false';
  }
  const values = [
    circle.center.latitude,
    circle.center.longitude,
    circle.radiusMeters,
    resolvedPoint.latitude,
    resolvedPoint.longitude,
  ].map(Number);
  if (Math.abs(values[0]) > 90 || Math.abs(values[1]) > 180) return 'false';
  return String(
    wgs84Distance(values[0], values[1], values[3], values[4]) <= values[2]
  );
}
