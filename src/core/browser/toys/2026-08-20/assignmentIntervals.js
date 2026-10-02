/**
 * @param {Map<string, Record<string, unknown>>} segments Segment records.
 * @param {Map<string, Record<string, unknown>>} points Point records.
 * @param {string} segmentId Segment identifier.
 * @returns {{startTime: number, endTime: number}} Temporal interval.
 */
export function resolveInterval(segments, points, segmentId) {
  const segment = segments.get(segmentId);
  if (!segment) throw new Error(`Unknown segment: ${segmentId}`);
  const start = points.get(String(segment.startPointId));
  const end = points.get(String(segment.endPointId));
  if (!start || !end)
    throw new Error(`Segment ${segmentId} references an unknown point.`);
  const startTime = Date.parse(String(start.timestamp));
  const endTime = Date.parse(String(end.timestamp));
  if (!isOrderedInterval(startTime, endTime)) {
    throw new Error(
      `Segment ${segmentId} must have an ordered valid time interval.`
    );
  }
  return { startTime, endTime };
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
  const points = new Map(request.points.map(point => [point.pointId, point]));
  const segments = new Map(
    request.segments.map(segment => [segment.segmentId, segment])
  );
  const proposed = resolveInterval(
    segments,
    points,
    request.proposedAssignment.segmentId
  );
  return request.assignments
    .filter(
      assignment =>
        assignment[ownerKey] === request.proposedAssignment[ownerKey]
    )
    .every(
      assignment =>
        !overlaps(
          resolveInterval(segments, points, assignment.segmentId),
          proposed
        )
    );
}
