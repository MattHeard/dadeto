// Coordinate-resolved segment calculations with caller-specific failure policies.
import { wgs84Distance } from './wgs84Distance.js';
import { wgs84CirclePointPredicate } from './wgs84CirclePointPredicate.js';
import { indexResolvedPoints } from '../2026-08-22/spacePointResolution.js';

/**
 * Calculate travel duration for a constant-speed segment.
 * @param {string} input JSON with points, segment, and speedKilometersPerHour.
 * @returns {string} Scalar seconds object.
 */
export function constantSpeedGeodesicTravelDuration(input) {
  try {
    const x = JSON.parse(input);
    if (!x || !Array.isArray(x.points) || !x.segment)
      throw new Error('Valid segment points and positive speed are required.');
    const points = indexResolvedPoints(x.points, x.spacePoints),
      s = x.segment;
    const a = points.get(s.startPointId),
      b = points.get(s.endPointId),
      speed = Number(x.speedKilometersPerHour);
    if (!a || !b || !Number.isFinite(speed) || speed <= 0)
      throw new Error('Valid segment points and positive speed are required.');
    const distance = wgs84Distance(
      Number(a.latitude),
      Number(a.longitude),
      Number(b.latitude),
      Number(b.longitude)
    );
    if (
      ![a.latitude, a.longitude, b.latitude, b.longitude].every(value =>
        Number.isFinite(Number(value))
      )
    )
      throw new Error('Valid coordinates are required.');
    return JSON.stringify({
      value: String((distance / 1000 / speed) * 3600),
      unit: 'seconds',
    });
  } catch (error) {
    return JSON.stringify({
      valid: false,
      error: error.message,
    });
  }
}

/**
 * Determine whether both segment endpoints lie within a circle.
 * @param {string} input JSON with points, segment, and circle.
 * @returns {string} JSON boolean.
 */
export function wgs84CircleSegmentPredicate(input) {
  let x;
  try {
    x = JSON.parse(input);
  } catch {
    return 'false';
  }
  if (!x || !Array.isArray(x.points) || !x.segment) return 'false';
  const points = indexResolvedPoints(x.points, x.spacePoints);
  const start = points.get(x.segment.startPointId),
    end = points.get(x.segment.endPointId);
  if (!start || !end) return 'false';
  const inside =
    /**
     * @param {Record<string, unknown>} point Point record.
     * @returns {string} Circle predicate result.
     */
    point => {
      const { latitude, longitude } = point;
      return wgs84CirclePointPredicate(
        JSON.stringify({
          circle: x.circle,
          point: { ...point, latitude, longitude },
        })
      );
    };
  return String(inside(start) === 'true' && inside(end) === 'true');
}
