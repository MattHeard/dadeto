import { resolveInterval, overlaps } from './assignmentIntervals.js';
export { resolveInterval, overlaps } from './assignmentIntervals.js';

// Toy: Asset Custodian Segment Assignment Predicate
// (input, env) -> string

/**
 * Decide whether an asset and its custodian can be assigned to a segment.
 * @param {string} input JSON payload containing points, segments, assignments, and proposedAssignment.
 * @returns {string} JSON boolean result.
 */
export function assetCustodianSegmentAssignmentPredicate(input) {
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
    const assetFree = request.assetAssignments
      .filter(
        assignment => assignment.assetId === request.proposedAssignment.assetId
      )
      .every(
        assignment =>
          !overlaps(
            resolveInterval(segments, points, assignment.segmentId),
            proposed
          )
      );
    const custodianFree = request.personAssignments
      .filter(
        assignment =>
          assignment.personId === request.proposedAssignment.custodianPersonId
      )
      .every(
        assignment =>
          !overlaps(
            resolveInterval(segments, points, assignment.segmentId),
            proposed
          )
      );
    return JSON.stringify(assetFree && custodianFree);
  } catch {
    return 'false';
  }
}

/**
 * @param {string} input JSON request.
 * @returns {{points: Array<{pointId: string, timestamp: string}>, segments: Array<{segmentId: string, startPointId: string, endPointId: string}>, assetAssignments: Array<{assetId: string, segmentId: string}>, personAssignments: Array<{personId: string, segmentId: string}>, proposedAssignment: {assetId: string, segmentId: string, custodianPersonId: string}}} Parsed request.
 */
export function parseRequest(input) {
  const request = JSON.parse(input);
  // Stryker disable all -- defensive request type boundary.
  if (!request || typeof request !== 'object' || Array.isArray(request))
    throw new Error('Input must be a JSON object.');
  if (
    !Array.isArray(request.points) ||
    !Array.isArray(request.segments) ||
    !Array.isArray(request.assetAssignments) ||
    !Array.isArray(request.personAssignments)
  )
    throw new Error(
      'points, segments, assetAssignments, and personAssignments arrays are required.'
    );
  // Stryker restore all
  const proposedAssignment = normalizeProposed(request.proposedAssignment);
  if (!proposedAssignment)
    throw new Error('A complete proposed assignment is required.');
  return {
    points: request.points,
    segments: request.segments,
    assetAssignments: request.assetAssignments
      .map(normalizeAsset)
      .filter(Boolean),
    personAssignments: request.personAssignments
      .map(normalizePerson)
      .filter(Boolean),
    proposedAssignment,
  };
}

/**
 * Normalize an asset assignment.
 * @param {unknown} value Candidate asset assignment.
 * @returns {{assetId: string, segmentId: string}|null} Normalized assignment.
 */
export function normalizeAsset(value) {
  return normalizeAssignmentFields(value, ['assetId', 'segmentId']);
}

/**
 * Normalize a person assignment.
 * @param {unknown} value Candidate person assignment.
 * @returns {{personId: string, segmentId: string}|null} Normalized assignment.
 */
export function normalizePerson(value) {
  return normalizeAssignmentFields(value, ['personId', 'segmentId']);
}

/**
 * Normalize a proposed assignment.
 * @param {unknown} value Candidate proposed assignment.
 * @returns {{assetId: string, segmentId: string, custodianPersonId: string}|null} Normalized proposed assignment.
 */
export function normalizeProposed(value) {
  return normalizeAssignmentFields(value, [
    'assetId',
    'segmentId',
    'custodianPersonId',
  ]);
}

/**
 * Normalize required assignment identifiers using the existing falsy fallback.
 * @template {string} K
 * @param {unknown} value Candidate assignment record.
 * @param {K[]} keys Required identifier keys.
 * @returns {Record<K, string>|null} Complete identifiers or null.
 */
function normalizeAssignmentFields(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = /** @type {Record<string, unknown>} */ (value);
  const normalized = /** @type {Record<K, string>} */ (
    Object.fromEntries(keys.map(key => [key, String(record[key] || '').trim()]))
  );
  return Object.values(normalized).every(Boolean) ? normalized : null;
}
