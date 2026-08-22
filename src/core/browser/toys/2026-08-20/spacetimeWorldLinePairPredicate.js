// @ts-nocheck
// Toy: Spacetime World-Line Pair Predicate
import { formatToyError } from '../formatToyError.js';
import { resolvePointRecords } from '../2026-08-22/spacePointResolution.js';

/** @param {string} input JSON with points, segments, and two IDs. @returns {string} JSON boolean. */
export function spacetimeWorldLinePairPredicate(input) {
  try {
    const x = JSON.parse(input);
    if (!x || !Array.isArray(x.points) || !Array.isArray(x.segments))
      throw new Error('Points and segments are required.');
    const points = new Map(resolvePointRecords(x.points, x.spacePoints).map(p => [p.pointId, p]));
    const segments = new Map(x.segments.map(s => [s.segmentId, s]));
    const a = interval(segments, points, x.firstSegmentId);
    const b = interval(segments, points, x.secondSegmentId);
    if (Math.max(a.startTime, b.startTime) < Math.min(a.endTime, b.endTime))
      return 'false';
    if (a.endTime === b.startTime)
      return String(a.endPointId === b.startPointId);
    if (b.endTime === a.startTime)
      return String(b.endPointId === a.startPointId);
    return 'true';
  } catch (error) {
    return formatToyError(
      error.message
    );
  }
}
/**
 *
 * @param segments
 * @param points
 * @param id
 */
function interval(segments, points, id) {
  const s = segments.get(id);
  if (!s) throw new Error(`Unknown segment: ${id}`);
  const start = points.get(s.startPointId),
    end = points.get(s.endPointId);
  if (!start || !end) throw new Error('Segment references an unknown point.');
  const startTime = Date.parse(start.timestamp),
    endTime = Date.parse(end.timestamp);
  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    endTime < startTime
  )
    throw new Error('Segment must have an ordered valid UTC interval.');
  return {
    startTime,
    endTime,
    startPointId: s.startPointId,
    endPointId: s.endPointId,
  };
}
