import { canAppendAssignment } from './assignmentIntervals.js';
export { resolveInterval, overlaps } from './assignmentIntervals.js';

// Toy: Asset Segment Assignment Predicate
// (input, env) -> string

/**
 * Decide whether an asset-to-segment assignment can be appended.
 * @param {string} input JSON payload containing points, segments, assignments, and proposedAssignment.
 * @returns {string} JSON boolean result.
 */
export function assetSegmentAssignmentPredicate(input) {
  try {
    const request = parseRequest(input);
    return JSON.stringify(canAppendAssignment(request, 'assetId'));
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
  if (
    !request ||
    typeof request !== 'object' ||
    Object.getPrototypeOf(request) !== Object.prototype
  ) {
    throw new Error('Input must be a JSON object.');
  }
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
  if (
    !value ||
    typeof value !== 'object' ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    return null;
  const assignment = /** @type {Record<string, unknown>} */ (value);
  const assetId = String(assignment.assetId || '').trim();
  const segmentId = String(assignment.segmentId || '').trim();
  return assetId && segmentId ? { assetId, segmentId } : null;
}
