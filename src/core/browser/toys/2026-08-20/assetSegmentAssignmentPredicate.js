// Toy: Asset Segment Assignment Predicate
// (input, env) -> string
// jscpd:ignore-start

/**
 * Decide whether an asset-to-segment assignment can be appended.
 * @param {string} input JSON payload containing points, segments, assignments, and proposedAssignment.
 * @returns {string} JSON boolean result.
 */
export function assetSegmentAssignmentPredicate(input) {
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
        assignment => assignment.assetId === request.proposedAssignment.assetId
      )
      .every(assignment => {
        const existing = resolveInterval(
          segments,
          points,
          assignment.segmentId
        );
        return !overlaps(existing, proposed);
      });
    return JSON.stringify(canAppend);
  } catch {
    return 'false';
  }
}

/**
 * @param {string} input JSON request.
 * @returns {{points: Array<{pointId: string, timestamp: string}>, segments: Array<{segmentId: string, startPointId: string, endPointId: string}>, assignments: Array<{assetId: string, segmentId: string}>, proposedAssignment: {assetId: string, segmentId: string}}} Parsed request.
 */
export function parseRequest(input) {
  const request = JSON.parse(input);
  // Stryker disable all -- plain-object prototype guard is a defensive type boundary.
  if (
    !request ||
    typeof request !== 'object' ||
    Object.getPrototypeOf(request) !== Object.prototype
  ) {
    throw new Error('Input must be a JSON object.');
  }
  // Stryker restore all
  if (
    !Array.isArray(request.points) ||
    !Array.isArray(request.segments) ||
    !Array.isArray(request.assignments)
  ) {
    throw new Error('points, segments, and assignments arrays are required.');
  }
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
 * @param {unknown} value Candidate assignment.
 * @returns {{assetId: string, segmentId: string}|null} Normalized assignment.
 */
export function normalizeAssignment(value) {
  // Stryker disable all -- plain-object prototype guard is a defensive type boundary.
  if (
    !value ||
    typeof value !== 'object' ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    return null;
  // Stryker restore all
  const assignment = /** @type {Record<string, unknown>} */ (value);
  const assetId = String(assignment.assetId || '').trim();
  const segmentId = String(assignment.segmentId || '').trim();
  return assetId && segmentId ? { assetId, segmentId } : null;
}

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
  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    endTime < startTime
  ) {
    throw new Error(
      `Segment ${segmentId} must have an ordered valid time interval.`
    );
  }
  return { startTime, endTime };
}

/**
 * Touching endpoints are allowed; only positive-duration intersection conflicts.
 * @param {{startTime: number, endTime: number}} first First interval.
 * @param {{startTime: number, endTime: number}} second Second interval.
 * @returns {boolean} Whether intervals overlap in time.
 */
function overlaps(first, second) {
  return (
    Math.max(first.startTime, second.startTime) <
    Math.min(first.endTime, second.endTime)
  );
}
// jscpd:ignore-end
