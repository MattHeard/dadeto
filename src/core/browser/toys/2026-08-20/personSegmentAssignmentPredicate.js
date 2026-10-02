import { canAppendAssignment } from './assignmentIntervals.js';
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
    return JSON.stringify(canAppendAssignment(request, 'personId'));
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
  if (
    !request ||
    typeof request !== 'object' ||
    Object.getPrototypeOf(request) !== Object.prototype
  )
    throw new Error('points, segments, and assignments arrays are required.');
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
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const assignment = /** @type {Record<string, unknown>} */ (value);
  const personId = String(assignment.personId || '').trim();
  const segmentId = String(assignment.segmentId || '').trim();
  return personId && segmentId ? { personId, segmentId } : null;
}
