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
