// @ts-nocheck
// Toy: WGS84 Circle Segment Predicate
import { wgs84CirclePointPredicate } from './wgs84CirclePointPredicate.js';

/** @param {string} input JSON with points, segment, and circle. @returns {string} JSON boolean. */
export function wgs84CircleSegmentPredicate(input) {
  let x;
  try {
    x = JSON.parse(input || '{}');
  } catch {
    return 'false';
  }

  if (!Array.isArray(x.points) || !x.segment) return 'false';
  const points = new Map(x.points.map(p => [p.pointId, p]));
  const start = points.get(x.segment.startPointId),
    end = points.get(x.segment.endPointId);
  if (!start || !end) return 'false';
  const inside = point => {
    const { latitude, longitude } = point;
    return wgs84CirclePointPredicate(
      JSON.stringify({ circle: x.circle, point: { ...point, latitude, longitude } })
    );
  };
  return String(
    inside(start) === 'true' && inside(end) === 'true'
  );
}
