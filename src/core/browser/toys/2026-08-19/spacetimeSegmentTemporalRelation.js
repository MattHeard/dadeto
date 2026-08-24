// Toy: Spacetime Segment Temporal Relation
// (input, env) -> string
import { resolvePointRecords } from '../2026-08-22/spacePointResolution.js';
import { isJsonObject, normalizeSegmentId } from './spacetimeInput.js';
import { resolveSegmentTiming } from '../2026-08-21/segmentAssignmentFeasibilityCore.js';

/**
 * Classify the temporal relation between two SPAC2 segments.
 * @param {string} input JSON payload containing points, segments, and segment IDs.
 * @returns {string} Relation result.
 */
export function spacetimeSegmentTemporalRelation(input) {
  try {
    const request = parseRequest(input);
    const points = new Map(request.points.map(point => [point.pointId, point]));
    const segments = new Map(
      request.segments.map(segment => [segment.segmentId, segment])
    );
    const left = resolveInterval(segments, points, request.firstSegmentId);
    const right = resolveInterval(segments, points, request.secondSegmentId);
    const relation = classify(left, right);
    return JSON.stringify(
      {
        firstSegmentId: request.firstSegmentId,
        secondSegmentId: request.secondSegmentId,
        relation,
        firstInterval: left,
        secondInterval: right,
      },
      null,
      2
    );
  } catch (error) {
    return JSON.stringify(
      {
        valid: false,
        error: error.message,
      },
      null,
      2
    );
  }
}

/**
 * Parse and validate a relation request.
 * @param {string} input Raw JSON input.
 * @returns {{points: Array<{pointId: string, timestamp: string}>, segments: Array<{segmentId: string, startPointId: string, endPointId: string}>, firstSegmentId: string, secondSegmentId: string}} Parsed request.
 */
function parseRequest(input) {
  const request = JSON.parse(input || '{}');
  if (!isJsonObject(request)) {
    throw new Error('Input must be a JSON object.');
  }
  if (!Array.isArray(request.points) || !Array.isArray(request.segments)) {
    throw new Error('points and segments arrays are required.');
  }
  const firstSegmentId = normalizeSegmentId(request.firstSegmentId);
  const secondSegmentId = normalizeSegmentId(request.secondSegmentId);
  if (!firstSegmentId || !secondSegmentId) {
    throw new Error('firstSegmentId and secondSegmentId are required.');
  }
  return {
    points: /** @type {Array<{pointId: string, timestamp: string}>} */ (
      resolvePointRecords(request.points, request.spacePoints)
    ),
    segments:
      /** @type {Array<{segmentId: string, startPointId: string, endPointId: string}>} */ (
        request.segments
      ),
    firstSegmentId,
    secondSegmentId,
  };
}

/**
 * Resolve a segment into its timestamp interval.
 * @param {Map<string, Record<string, unknown>>} segments Segment records.
 * @param {Map<string, Record<string, unknown>>} points Point records.
 * @param {string} segmentId Segment identifier.
 * @returns {{start: string, end: string, startTime: number, endTime: number, startPointId: string, endPointId: string}} Resolved interval.
 */
function resolveInterval(segments, points, segmentId) {
  const timing = resolveSegmentTiming(
    segments,
    points,
    segmentId,
    'time interval'
  );
  return {
    start: timing.startTimestamp,
    end: timing.endTimestamp,
    startTime: timing.startTime,
    endTime: timing.endTime,
    startPointId: timing.startPointId,
    endPointId: timing.endPointId,
  };
}

/**
 * Classify two closed temporal intervals.
 * @param {{startTime: number, endTime: number, startPointId: string, endPointId: string}} first First interval.
 * @param {{startTime: number, endTime: number, startPointId: string, endPointId: string}} second Second interval.
 * @returns {'disjoint'|'touching'|'overlapping'} Temporal relation.
 */
function classify(first, second) {
  const overlapStart = Math.max(first.startTime, second.startTime);
  const overlapEnd = Math.min(first.endTime, second.endTime);
  if (sharesBoundaryPoint(first, second)) {
    return 'touching';
  }
  return overlapStart < overlapEnd ? 'overlapping' : 'disjoint';
}

/**
 * Check whether a zero-duration temporal intersection is the same point.
 * @param {{startTime: number, endTime: number, startPointId: string, endPointId: string}} first First interval.
 * @param {{startTime: number, endTime: number, startPointId: string, endPointId: string}} second Second interval.
 * @returns {boolean} Whether the shared boundary point is identical.
 */
function sharesBoundaryPoint(first, second) {
  return (
    (first.endTime === second.startTime &&
      first.endPointId === second.startPointId) ||
    (second.endTime === first.startTime &&
      second.endPointId === first.startPointId)
  );
}

export {
  classify,
  isJsonObject,
  normalizeSegmentId,
  parseRequest,
  resolveInterval,
  sharesBoundaryPoint,
};
