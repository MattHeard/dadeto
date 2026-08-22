// Toy: WGS84 Circle Point Predicate
import { wgs84Distance } from './wgs84Distance.js';
import { resolvePoint } from '../2026-08-22/spacePointResolution.js';

/** @param {string} input JSON with circle and point. @returns {string} JSON boolean. */
export function wgs84CirclePointPredicate(input) {
  let parsed;
  try {
    parsed = JSON.parse(input || '{}');
  } catch {
    parsed = {};
  }
  const { circle, point } = parsed || {};
  if (!circle || !circle.center || !point) return 'false';
  let resolvedPoint;
  try {
    resolvedPoint = resolvePoint(point, new Map((parsed.spacePoints || []).map(
      /** @param {Record<string, unknown>} spacePoint */ spacePoint => [String(spacePoint.spacePointId), spacePoint]
    )));
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
  if (
    Math.abs(values[0]) > 90 ||
    Math.abs(values[3]) > 90 ||
    Math.abs(values[1]) > 180 ||
    Math.abs(values[4]) > 180
  )
    return 'false';
  return String(
    wgs84Distance(values[0], values[1], values[3], values[4]) <= values[2]
  );
}
