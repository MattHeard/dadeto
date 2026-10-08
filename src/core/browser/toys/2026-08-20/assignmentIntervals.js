import { tryOr } from '../../../commonCore.js';

/**
 * @param {Map<string, Record<string, unknown>>} segments Segment records.
 * @param {Map<string, Record<string, unknown>>} points Point records.
 * @param {string} segmentId Segment identifier.
 * @returns {{startTime: number, endTime: number}} Temporal interval.
 */
export function resolveInterval(segments, points, segmentId) {
  const { startTime, endTime } = resolveSegmentTiming(
    segments,
    points,
    segmentId,
    'time interval'
  );
  return { startTime, endTime };
}

/**
 * Resolve a segment into the timestamp interval exposed by spacetime toys.
 * @param {Map<string, Record<string, unknown>>} segments Segment records.
 * @param {Map<string, Record<string, unknown>>} points Point records.
 * @param {string} segmentId Segment identifier.
 * @returns {{start: string, end: string, startTime: number, endTime: number, startPointId: string, endPointId: string}} Resolved interval.
 */
export function resolveTimestampInterval(segments, points, segmentId) {
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
 * Resolve a segment's endpoint records and timestamps.
 * @param {Map<string, Record<string, unknown> | undefined>} segments Segment records.
 * @param {Map<string, Record<string, unknown>>} points Point records.
 * @param {string} segmentId Segment identifier.
 * @param {string} intervalLabel Error message interval label.
 * @returns {{startPointId: string, endPointId: string, startTimestamp: string, endTimestamp: string, startTime: number, endTime: number, start: Record<string, unknown>, end: Record<string, unknown>}} Resolved segment timing.
 */
export function resolveSegmentTiming(
  segments,
  points,
  segmentId,
  intervalLabel = 'interval'
) {
  const segment = segments.get(segmentId);
  if (!segment) throw new Error(`Unknown segment: ${segmentId}`);
  const startPointId = String(segment.startPointId);
  const endPointId = String(segment.endPointId);
  const start = points.get(startPointId);
  const end = points.get(endPointId);
  if (!start || !end)
    throw new Error(`Segment ${segmentId} references an unknown point.`);
  const startTimestamp = String(start.timestamp);
  const endTimestamp = String(end.timestamp);
  const startTime = Date.parse(startTimestamp);
  const endTime = Date.parse(endTimestamp);
  if (!isOrderedInterval(startTime, endTime))
    throw new Error(
      `Segment ${segmentId} must have an ordered valid ${intervalLabel}.`
    );
  return {
    startPointId,
    endPointId,
    startTimestamp,
    endTimestamp,
    startTime,
    endTime,
    start,
    end,
  };
}

/**
 * Check parsed interval endpoints without changing their caller's error contract.
 * @param {number} startTime Start epoch milliseconds.
 * @param {number} endTime End epoch milliseconds.
 * @returns {boolean} Whether both endpoints are finite and ordered.
 */
export function isOrderedInterval(startTime, endTime) {
  return (
    Number.isFinite(startTime) &&
    Number.isFinite(endTime) &&
    endTime >= startTime
  );
}

/**
 * Touching endpoints are allowed; only positive-duration intersection conflicts.
 * @param {{startTime: number, endTime: number}} first First interval.
 * @param {{startTime: number, endTime: number}} second Second interval.
 * @returns {boolean} Whether intervals overlap in time.
 */
export function overlaps(first, second) {
  return (
    Math.max(first.startTime, second.startTime) <
    Math.min(first.endTime, second.endTime)
  );
}
/**
 * Test a proposed assignment against existing intervals for the same owner.
 * @param {{points: Array<{pointId: string, timestamp: string}>, segments: Array<{segmentId: string, startPointId: string, endPointId: string}>, assignments: Array<{segmentId: string, [key: string]: unknown}>, proposedAssignment: {segmentId: string, [key: string]: unknown}}} request Caller-normalized request.
 * @param {string} ownerKey Assignment owner field.
 * @returns {boolean} Whether the proposed interval avoids overlap.
 */
export function canAppendAssignment(request, ownerKey) {
  return ownerIsFree(
    request.assignments,
    ownerKey,
    request.proposedAssignment[ownerKey],
    createAssignmentContext(request)
  );
}

/**
 * Serialize owner availability while retaining the toys' false-on-error boundary.
 * @param {string} input Serialized assignment request.
 * @param {(input: string) => Parameters<typeof canAppendAssignment>[0]} parse Caller-specific parser.
 * @param {string} ownerKey Owner field.
 * @returns {string} JSON boolean, including false for malformed input.
 */
export function assignmentPredicateBoundary(input, parse, ownerKey) {
  return /** @type {string} */ (
    tryOr(
      () => JSON.stringify(canAppendAssignment(parse(input), ownerKey)),
      () => 'false'
    )
  );
}

/**
 * Prepare shared point/segment indexes and the proposed interval once.
 * @param {Pick<Parameters<typeof canAppendAssignment>[0], 'points' | 'segments' | 'proposedAssignment'>} request Normalized interval request.
 * @returns {{points: Map<string, Record<string, unknown>>, segments: Map<string, Record<string, unknown>>, proposed: {startTime: number, endTime: number}}} Interval evaluation context.
 */
export function createAssignmentContext(request) {
  const indexes = createIntervalIndexes(request);
  const proposed = resolveInterval(
    indexes.segments,
    indexes.points,
    request.proposedAssignment.segmentId
  );
  return { ...indexes, proposed };
}

/**
 * Prepare point and segment lookup maps without coercing keys or cloning records.
 * @param {Pick<Parameters<typeof canAppendAssignment>[0], 'points' | 'segments'>} request Normalized interval records.
 * @returns {{points: Map<string, Record<string, unknown>>, segments: Map<string, Record<string, unknown>>}} Point-first indexes with later duplicate IDs winning.
 */
export function createIntervalIndexes(request) {
  const points = new Map(request.points.map(point => [point.pointId, point]));
  const segments = new Map(
    request.segments.map(segment => [segment.segmentId, segment])
  );
  return { points, segments };
}

/**
 * Check one owner's existing assignments against a prepared proposed interval.
 * @param {Array<{segmentId: string, [key: string]: unknown}>} assignments Existing assignments.
 * @param {string} ownerKey Owner identifier field.
 * @param {unknown} ownerId Proposed owner identifier.
 * @param {ReturnType<typeof createAssignmentContext>} context Prepared interval indexes.
 * @returns {boolean} Whether this owner has no overlapping interval.
 */
export function ownerIsFree(assignments, ownerKey, ownerId, context) {
  const { points, segments, proposed } = context;
  return assignments
    .filter(assignment => assignment[ownerKey] === ownerId)
    .every(
      assignment =>
        !overlaps(
          resolveInterval(segments, points, assignment.segmentId),
          proposed
        )
    );
}
