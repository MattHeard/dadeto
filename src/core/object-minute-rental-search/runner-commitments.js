/**
 * Build a fail-closed runner commitment projection from resolved records.
 * @param {{runnerId: unknown, assignments: unknown[], assumeMatching?: boolean, resolveSegment: (segmentId: string) => unknown|Promise<unknown>, resolvePoint: (pointId: string) => unknown|Promise<unknown>}} options Projection inputs.
 * @returns {Promise<Array<{startTimestamp: string, endTimestamp: string}>>} Commitment intervals.
 */
export async function projectRunnerCommitments({
  runnerId,
  assignments,
  assumeMatching = false,
  resolveSegment,
  resolvePoint,
}) {
  if (!Array.isArray(assignments)) throw new Error('invalid-assignments');
  const matching = assumeMatching
    ? assignments
    : assignments.filter(assignment => assignment?.personId === runnerId);
  const projected = [];
  for (const assignment of matching) {
    if (assumeMatching && assignment?.personId !== runnerId)
      throw new Error('invalid-person-id');
    const segmentId = usableId(assignment.segmentId);
    if (!segmentId) throw new Error('missing-segment-id');
    const segment = await resolveSegment(segmentId);
    if (!segment || typeof segment !== 'object')
      throw new Error('missing-segment');
    const startPointId = usableId(segment.startPointId);
    const endPointId = usableId(segment.endPointId);
    if (!startPointId) throw new Error('missing-start-point-id');
    if (!endPointId) throw new Error('missing-end-point-id');
    const [startPoint, endPoint] = await Promise.all([
      resolvePoint(startPointId),
      resolvePoint(endPointId),
    ]);
    const startTimestamp = usableTimestamp(startPoint?.timestamp);
    const endTimestamp = usableTimestamp(endPoint?.timestamp);
    if (!startTimestamp) throw new Error('invalid-start-timestamp');
    if (!endTimestamp) throw new Error('invalid-end-timestamp');
    if (Date.parse(endTimestamp) < Date.parse(startTimestamp))
      throw new Error('reversed-commitment-interval');
    projected.push({ startTimestamp, endTimestamp });
  }
  return projected.sort(compareIntervals);
}

/**
 * Normalize a persisted identifier without coercing absent values.
 * @param {unknown} value Candidate identifier.
 * @returns {string|null} Usable identifier or null.
 */
function usableId(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Validate a persisted timestamp without coercing malformed values.
 * @param {unknown} value Candidate timestamp.
 * @returns {string|null} Usable timestamp or null.
 */
function usableTimestamp(value) {
  return typeof value === 'string' &&
    value.trim() &&
    Number.isFinite(Date.parse(value))
    ? value
    : null;
}

/**
 * Order projected intervals deterministically.
 * @param {{startTimestamp: string, endTimestamp: string}} first First interval.
 * @param {{startTimestamp: string, endTimestamp: string}} second Second interval.
 * @returns {number} Sort comparison.
 */
function compareIntervals(first, second) {
  return (
    Date.parse(first.startTimestamp) - Date.parse(second.startTimestamp) ||
    Date.parse(first.endTimestamp) - Date.parse(second.endTimestamp)
  );
}
