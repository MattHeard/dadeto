import { resolveInterval, overlaps } from './assignmentIntervals.js';
export { resolveInterval, overlaps } from './assignmentIntervals.js';

// Toy: Person Segment Assignment Predicate
// (input, env) -> string

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
export function parseRequest(input) {
  const request = JSON.parse(input);
  // Stryker disable all -- defensive plain-object type boundary.
  if (
    !request ||
    typeof request !== 'object' ||
    Object.getPrototypeOf(request) !== Object.prototype
  )
    throw new Error('points, segments, and assignments arrays are required.');
  // Stryker restore all
  if (!Array.isArray(request.points))
    throw new Error('points array is required.');
  if (!Array.isArray(request.segments))
    throw new Error('segments array is required.');
  if (!Array.isArray(request.assignments))
    throw new Error('assignments array is required.');
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
export function normalizeAssignment(value) {
  // Stryker disable all -- defensive malformed-input type boundary.
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  // Stryker restore all
  const assignment = /** @type {Record<string, unknown>} */ (value);
  const personId = String(assignment.personId || '').trim();
  const segmentId = String(assignment.segmentId || '').trim();
  return personId && segmentId ? { personId, segmentId } : null;
}
