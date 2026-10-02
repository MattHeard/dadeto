import { createAssignmentContext, ownerIsFree } from './assignmentIntervals.js';
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
    const context = createAssignmentContext(request);
    const assetFree = ownerIsFree(
      request.assetAssignments,
      'assetId',
      request.proposedAssignment.assetId,
      context
    );
    const custodianFree = ownerIsFree(
      request.personAssignments,
      'personId',
      request.proposedAssignment.custodianPersonId,
      context
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
