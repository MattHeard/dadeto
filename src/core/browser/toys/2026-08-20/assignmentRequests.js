import {
  assignmentPredicateBoundary,
  createAssignmentContext,
  ownerIsFree,
  resolveInterval,
  overlaps,
} from './assignmentIntervals.js';
import { isPlainPrototypeObject as isPlainAssignmentRecord } from '../browserToysCore.js';
import { appendReferenceList } from '../2026-08-18/memoryObjectListAppend.js';

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
function parseRequest(input) {
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
  return preparePredicateRequest(
    request,
    normalizeProposed,
    'A complete proposed assignment is required.',
    normalizeCustodianCollections
  );
}

/**
 * Normalize the paired asset and person collections without changing their order.
 * @param {Record<string, any>} request Custodian request.
 * @returns {{assetAssignments: Array<{assetId: string, segmentId: string}>, personAssignments: Array<{personId: string, segmentId: string}>}} Accepted collections.
 */
function normalizeCustodianCollections(request) {
  const assetAssignments = request.assetAssignments
    .map(normalizeAsset)
    .filter(Boolean);
  const personAssignments = request.personAssignments
    .map(normalizePerson)
    .filter(Boolean);
  return { assetAssignments, personAssignments };
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

export { parseRequest as parseCustodianRequest };

/**
 * Compose reference parsing and persistence with an explicit memory policy.
 * @template {string} K
 * @param {{keys: K[], missingMessage: string, resolveMemoryLocation?: (request: Record<string, any>) => string | undefined}} policy Reference contract.
 * @returns {{parseRequest: (input: string) => {memoryLocation: string | undefined, path: string, assignment: Record<K, string>}, append: (input: string, env: import('../browserToysCore.js').ToyEnv) => string}} Public list operations.
 */
export function createReferenceAssignmentList(policy) {
  const resolveMemoryLocation =
    policy.resolveMemoryLocation || (request => request.memoryLocation);
  /**
   * Parse the reference before resolving its storage policy.
   * @param {string} input JSON request.
   * @returns {{memoryLocation: string | undefined, path: string, assignment: Record<K, string>}} Normalized list request.
   */
  function parseRequest(input) {
    const { request, path, assignment } = parseReferenceAssignment(
      input,
      policy.keys,
      policy.missingMessage
    );
    return { memoryLocation: resolveMemoryLocation(request), path, assignment };
  }
  /**
   * Append a parsed reference using the existing atomic storage boundary.
   * @param {string} input JSON request.
   * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
   * @returns {string} Structured append result.
   */
  function append(input, env) {
    return appendReferenceList(input, env, parseRequest);
  }
  return { parseRequest, append };
}

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
  return preparePredicateRequest(
    request,
    normalize,
    'A proposed assignment is required.',
    source => normalizeSingleCollections(source, normalize)
  );
}

/**
 * Normalize one owner's collection using the supplied reference policy.
 * @template T
 * @param {{assignments: unknown[]}} request Assignment collection.
 * @param {(value: unknown) => T | null} normalize Reference normalizer.
 * @returns {{assignments: T[]}} Accepted references.
 */
function normalizeSingleCollections(request, normalize) {
  const assignments = request.assignments.flatMap(value => {
    const assignment = normalize(value);
    return assignment ? [assignment] : [];
  });
  return { assignments };
}

/**
 * Validate the proposal before composing graph references and collections.
 * @template {{points: any, segments: any, proposedAssignment: unknown}} R
 * @template C, A
 * @param {R} request Validated caller request.
 * @param {(value: unknown) => A | null} normalize Proposal normalizer.
 * @param {string} missingMessage Caller-specific proposal error.
 * @param {(request: R) => C} normalizeCollections Collection policy.
 * @returns {{points: R['points'], segments: R['segments'], proposedAssignment: A} & C} Predicate request.
 */
function preparePredicateRequest(
  request,
  normalize,
  missingMessage,
  normalizeCollections
) {
  const proposedAssignment = normalize(request.proposedAssignment);
  if (!proposedAssignment) throw new Error(missingMessage);
  const points = request.points;
  const segments = request.segments;
  const collections = normalizeCollections(request);
  return { points, segments, ...collections, proposedAssignment };
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
