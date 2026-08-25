// Toy: Spacetime World-Line Pair Predicate
import { formatToyError } from '../formatToyError.js';
import { resolvePointRecords } from '../2026-08-22/spacePointResolution.js';

/**
 * Determine whether two spacetime segments are non-overlapping and connected.
 * @param {string} input JSON with points, segments, and two IDs.
 * @returns {string} JSON boolean.
 */
export function spacetimeWorldLinePairPredicate(input) {
  try {
    const x = JSON.parse(input);
    if (!x || !Array.isArray(x.points) || !Array.isArray(x.segments))
      throw new Error('Points and segments are required.');
    const points = /** @type {Map<string, Record<string, unknown>>} */ (
      new Map(
        resolvePointRecords(x.points, x.spacePoints).map(p => [
          String(p.pointId),
          p,
        ])
      )
    );
    const segments = /** @type {Map<string, Record<string, unknown>>} */ (
      new Map(
        x.segments.map(
          /**
           * @param {Record<string, unknown>} s Segment record.
           * @returns {[string, Record<string, unknown>]} Segment-map entry.
           */
          s => [String(s.segmentId), s]
        )
      )
    );
    const a = interval(segments, points, String(x.firstSegmentId));
    const b = interval(segments, points, String(x.secondSegmentId));
    if (Math.max(a.startTime, b.startTime) < Math.min(a.endTime, b.endTime))
      return 'false';
    if (a.endTime === b.startTime)
      return String(a.endPointId === b.startPointId);
    if (b.endTime === a.startTime)
      return String(b.endPointId === a.startPointId);
    return 'true';
  } catch (error) {
    return formatToyError(error.message);
  }
}
/**
 * Resolve a segment into an ordered time interval.
 * @param {Map<string, Record<string, unknown>>} segments Segment records.
 * @param {Map<string, Record<string, unknown>>} points Point records.
 * @param {string} id Segment ID.
 * @returns {{startTime: number, endTime: number, startPointId: string, endPointId: string}} Interval.
 */
function interval(segments, points, id) {
  const s = segments.get(id);
  if (!s) throw new Error(`Unknown segment: ${id}`);
  const start = points.get(String(s.startPointId)),
    end = points.get(String(s.endPointId));
  // Stryker disable next-line all -- missing segment endpoints share the structured reference error contract.
  if (!start || !end) throw new Error('Segment references an unknown point.');
  const startTime = Date.parse(String(start.timestamp)),
    endTime = Date.parse(String(end.timestamp));
  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    endTime < startTime
  )
    throw new Error('Segment must have an ordered valid UTC interval.');
  return {
    startTime,
    endTime,
    startPointId: String(s.startPointId),
    endPointId: String(s.endPointId),
  };
}
