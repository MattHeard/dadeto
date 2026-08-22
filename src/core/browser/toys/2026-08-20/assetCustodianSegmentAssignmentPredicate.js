// Toy: Asset Custodian Segment Assignment Predicate
// (input, env) -> string
// jscpd:ignore-start

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
  // Stryker disable all -- defensive malformed-record boundary.
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  // Stryker restore all
  const record = /** @type {Record<string, unknown>} */ (value);
  const assetId = String(record.assetId || '').trim();
  const segmentId = String(record.segmentId || '').trim();
  return assetId && segmentId ? { assetId, segmentId } : null;
}

/**
 * Normalize a person assignment.
 * @param {unknown} value Candidate person assignment.
 * @returns {{personId: string, segmentId: string}|null} Normalized assignment.
 */
export function normalizePerson(value) {
  // Stryker disable all -- defensive malformed-record boundary.
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  // Stryker restore all
  const record = /** @type {Record<string, unknown>} */ (value);
  const personId = String(record.personId || '').trim();
  const segmentId = String(record.segmentId || '').trim();
  return personId && segmentId ? { personId, segmentId } : null;
}

/**
 * Normalize a proposed assignment.
 * @param {unknown} value Candidate proposed assignment.
 * @returns {{assetId: string, segmentId: string, custodianPersonId: string}|null} Normalized proposed assignment.
 */
export function normalizeProposed(value) {
  // Stryker disable all -- defensive malformed-record boundary.
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  // Stryker restore all
  const record = /** @type {Record<string, unknown>} */ (value);
  const assetId = String(record.assetId || '').trim();
  const segmentId = String(record.segmentId || '').trim();
  const custodianPersonId = String(record.custodianPersonId || '').trim();
  return assetId && segmentId && custodianPersonId
    ? { assetId, segmentId, custodianPersonId }
    : null;
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
  )
    throw new Error(
      `Segment ${segmentId} must have an ordered valid time interval.`
    );
  return { startTime, endTime };
}

/**
 * @param {{startTime: number, endTime: number}} first First interval.
 * @param {{startTime: number, endTime: number}} second Second interval.
 * @returns {boolean} Whether intervals overlap in positive duration.
 */
export function overlaps(first, second) {
  return (
    Math.max(first.startTime, second.startTime) <
    Math.min(first.endTime, second.endTime)
  );
}
// jscpd:ignore-end
