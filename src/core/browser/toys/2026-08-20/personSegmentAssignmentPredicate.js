// Toy: Person Segment Assignment Predicate
// (input, env) -> string
// jscpd:ignore-start

/**
 * Decide whether a person-to-segment assignment can be appended.
 * @param {string} input JSON payload containing points, segments, assignments, and proposedAssignment.
 * @returns {string} JSON boolean result.
 */
export function personSegmentAssignmentPredicate(input) {
  try {
    const request = parseRequest(input);
    const points = new Map(request.points.map(point => [point.pointId, point]));
    const segments = new Map(
      request.segments.map(segment => [segment.segmentId, segment])
    );
    const proposed = resolveInterval(
      segments,
      points,
      request.proposedAssignment.segmentId
    );
    const canAppend = request.assignments
      .filter(
        assignment =>
          assignment.personId === request.proposedAssignment.personId
      )
      .every(
        assignment =>
          !overlaps(
            resolveInterval(segments, points, assignment.segmentId),
            proposed
          )
      );
    return JSON.stringify(canAppend);
  } catch {
    return 'false';
  }
}

/**
 * Parse the request.
 * @param {string} input JSON request.
 * @returns {{points: Array<{pointId: string, timestamp: string}>, segments: Array<{segmentId: string, startPointId: string, endPointId: string}>, assignments: Array<{personId: string, segmentId: string}>, proposedAssignment: {personId: string, segmentId: string}}} Parsed request.
 */
function parseRequest(input) {
  const request = JSON.parse(input || '{}');
  if (
    !request ||
    typeof request !== 'object' ||
    Array.isArray(request) ||
    !Array.isArray(request.points) ||
    !Array.isArray(request.segments) ||
    !Array.isArray(request.assignments)
  )
    throw new Error('points, segments, and assignments arrays are required.');
  const proposedAssignment = normalizeAssignment(request.proposedAssignment);
  if (!proposedAssignment)
    throw new Error('A proposed assignment is required.');
  return {
    points: request.points,
    segments: request.segments,
    assignments: request.assignments.map(normalizeAssignment).filter(Boolean),
    proposedAssignment,
  };
}

/**
 * Normalize an assignment.
 * @param {unknown} value Candidate assignment.
 * @returns {{personId: string, segmentId: string}|null} Normalized assignment.
 */
function normalizeAssignment(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const assignment = /** @type {Record<string, unknown>} */ (value);
  const personId = String(assignment.personId || '').trim();
  const segmentId = String(assignment.segmentId || '').trim();
  return personId && segmentId ? { personId, segmentId } : null;
}

/**
 * @param {Map<string, Record<string, unknown>>} segments Segment records.
 * @param {Map<string, Record<string, unknown>>} points Point records.
 * @param {string} segmentId Segment identifier.
 * @returns {{startTime: number, endTime: number}} Temporal interval.
 */
function resolveInterval(segments, points, segmentId) {
  const segment = segments.get(segmentId);
  if (!segment) throw new Error(`Unknown segment: ${segmentId}`);
  const start = points.get(String(segment.startPointId));
  const end = points.get(String(segment.endPointId));
  if (!start || !end)
    throw new Error(`Segment ${segmentId} references an unknown point.`);
  const startTime = Date.parse(String(start.timestamp));
  const endTime = Date.parse(String(end.timestamp));
  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    endTime < startTime
  )
    throw new Error(
      `Segment ${segmentId} must have an ordered valid time interval.`
    );
  return { startTime, endTime };
}

/**
 * @param {{startTime: number, endTime: number}} first First interval.
 * @param {{startTime: number, endTime: number}} second Second interval.
 * @returns {boolean} Whether intervals overlap.
 */
function overlaps(first, second) {
  return (
    Math.max(first.startTime, second.startTime) <
    Math.min(first.endTime, second.endTime)
  );
}
// jscpd:ignore-end
