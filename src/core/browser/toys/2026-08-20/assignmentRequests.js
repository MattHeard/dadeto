import {
  assignmentPredicateBoundary,
  resolveInterval,
  overlaps,
} from './assignmentIntervals.js';
import { isPlainPrototypeObject as isPlainAssignmentRecord } from '../browserToysCore.js';

/**
 * Parse a reference-list request without selecting its memory-location policy.
 * @template {string} K
 * @param {string} input JSON request.
 * @param {K[]} keys Required identifier fields.
 * @param {string} missingMessage Existing caller-specific missing-ID error.
 * @returns {{request: Record<string, any>, path: string, assignment: Record<K, string>}} Normalized reference and original options.
 */
export function parseReferenceAssignment(input, keys, missingMessage) {
  const request = JSON.parse(input);
  if (request === null || typeof request !== 'object' || Array.isArray(request))
    throw new Error('Input must be a JSON object.');
  const source = request.assignment;
  if (source === null || typeof source !== 'object' || Array.isArray(source))
    throw new Error('An assignment object is required.');
  const assignment = /** @type {Record<K, string>} */ (
    Object.fromEntries(keys.map(key => [key, String(source[key] || '').trim()]))
  );
  if (!Object.values(assignment).every(Boolean))
    throw new Error(missingMessage);
  const path = String(request.path || '').trim();
  if (!path) throw new Error('A path is required.');
  return { request, path, assignment };
}

/**
 * Resolve the validated memory policy used by person and custodian lists.
 * @param {Record<string, unknown>} request Original options.
 * @returns {string} Supported memory location.
 */
export function referenceMemoryLocation(request) {
  const memoryLocation = String(request.memoryLocation || 'temporary');
  if (!['temporary', 'permanent', 'envelope'].includes(memoryLocation))
    throw new Error('Unsupported memory location.');
  return memoryLocation;
}
/**
 * Build a predicate request after caller-specific top-level validation.
 * @template {{segmentId: string}} T
 * @param {{points: Array<{pointId: string, timestamp: string}>, segments: Array<{segmentId: string, startPointId: string, endPointId: string}>, assignments: unknown[], proposedAssignment: unknown}} request Validated collections.
 * @param {(value: unknown) => T | null} normalize Caller-specific reference normalizer.
 * @returns {{points: Array<{pointId: string, timestamp: string}>, segments: Array<{segmentId: string, startPointId: string, endPointId: string}>, assignments: T[], proposedAssignment: T}} Predicate request.
 */
export function buildAssignmentPredicateRequest(request, normalize) {
  const proposedAssignment = normalize(request.proposedAssignment);
  if (!proposedAssignment)
    throw new Error('A proposed assignment is required.');
  return {
    points: request.points,
    segments: request.segments,
    assignments: request.assignments.flatMap(value => {
      const assignment = normalize(value);
      return assignment ? [assignment] : [];
    }),
    proposedAssignment,
  };
}

/**
 * Normalize the owner and segment identifiers after caller-specific shape checks.
 * @template {string} K
 * @param {Record<string, unknown>} assignment Accepted reference record.
 * @param {K} ownerKey Owner identifier field.
 * @returns {(Record<K, string> & {segmentId: string}) | null} Trimmed reference or null.
 */
export function normalizeOwnerAssignment(assignment, ownerKey) {
  const ownerId = String(assignment[ownerKey] || '').trim();
  const segmentId = String(assignment.segmentId || '').trim();
  return ownerId && segmentId
    ? /** @type {Record<K, string> & {segmentId: string}} */ ({
        [ownerKey]: ownerId,
        segmentId,
      })
    : null;
}

/**
 * Compose a predicate API with explicit reference and diagnostic policies.
 * @template {string} K
 * @param {{ownerKey: K, strictReferences: boolean, requestError: string, collectionErrors: Record<string, string>}} policy Caller-specific contract.
 * @returns {{parseRequest: (input: string) => {points: Array<{pointId: string, timestamp: string}>, segments: Array<{segmentId: string, startPointId: string, endPointId: string}>, assignments: (Record<K, string> & {segmentId: string})[], proposedAssignment: Record<K, string> & {segmentId: string}}, normalizeAssignment: (value: unknown) => (Record<K, string> & {segmentId: string}) | null, evaluate: (input: string) => string, resolveInterval: typeof resolveInterval, overlaps: typeof overlaps}} Configured public helpers.
 */
export function createAssignmentPredicate(policy) {
  /**
   * Normalize a reference with the configured shape policy.
   * @param {unknown} value Candidate reference.
   * @returns {(Record<K, string> & {segmentId: string}) | null} Accepted reference.
   */
  function normalizeAssignment(value) {
    const accepted = policy.strictReferences
      ? isPlainAssignmentRecord(value)
      : Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    if (!accepted) return null;
    return normalizeOwnerAssignment(
      /** @type {Record<string, unknown>} */ (value),
      policy.ownerKey
    );
  }
  /**
   * Parse and validate collections before normalizing references.
   * @param {string} input Serialized request.
   * @returns {ReturnType<ReturnType<typeof createAssignmentPredicate<K>>['parseRequest']>} Predicate request.
   */
  function parseRequest(input) {
    const request = JSON.parse(input);
    if (!isPlainAssignmentRecord(request)) throw new Error(policy.requestError);
    for (const field of ['points', 'segments', 'assignments']) {
      if (!Array.isArray(request[field])) {
        throw new Error(policy.collectionErrors[field]);
      }
    }
    const collections =
      /** @type {Parameters<typeof buildAssignmentPredicateRequest>[0]} */ (
        request
      );
    return buildAssignmentPredicateRequest(collections, normalizeAssignment);
  }
  /**
   * Evaluate a request using the configured owner field.
   * @param {string} input Serialized request.
   * @returns {string} JSON boolean.
   */
  function evaluate(input) {
    return assignmentPredicateBoundary(input, parseRequest, policy.ownerKey);
  }
  return {
    parseRequest,
    normalizeAssignment,
    evaluate,
    resolveInterval,
    overlaps,
  };
}
