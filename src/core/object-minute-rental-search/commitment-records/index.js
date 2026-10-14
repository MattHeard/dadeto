/** @typedef {{personId?: unknown, segmentId?: unknown}} Assignment */
/** @typedef {{startPointId?: unknown, endPointId?: unknown}} Segment */
/** @typedef {{timestamp?: unknown}} Point */

/** @typedef {{segmentId?: unknown}} SegmentRecord */
/** @typedef {{pointId?: unknown}} PointRecord */

/**
 * Create a browser/in-memory runner commitments repository.
 * @param {{runnerAssignments?: object[], segments?: SegmentRecord[], spacetimePoints?: PointRecord[]}} [records] Resolved records.
 * @returns {{listForRunner: (allowEffects: import('../../../../types/allow-effects').AllowEffects, options: {runnerId: string}) => Promise<Array<{startTimestamp: string, endTimestamp: string}>>}} Repository capability.
 */
export function createBrowserRunnerCommitmentsRepository({
  runnerAssignments = [],
  segments = [],
  spacetimePoints = [],
} = {}) {
  const segmentById = new Map(
    segments
      .filter(record => record?.segmentId)
      .map(record => [record.segmentId, record])
  );
  const pointById = new Map(
    spacetimePoints
      .filter(record => record?.pointId)
      .map(record => [record.pointId, record])
  );
  return {
    listForRunner: (allowEffectsOrOptions, maybeOptions) => {
      const options = maybeOptions ?? allowEffectsOrOptions;
      const { runnerId } = options;
      return projectRunnerCommitments({
        assignments: runnerAssignments,
        selectAssignments: assignments =>
          assignments.filter(assignment => assignment?.personId === runnerId),
        resolveSegment: segmentId => segmentById.get(segmentId),
        resolvePoint: pointId => pointById.get(pointId),
      });
    },
  };
}

/**
 * Build a fail-closed runner commitment projection from resolved records.
 * @param {{assignments: Assignment[], selectAssignments: (assignments: Assignment[]) => Assignment[], resolveSegment: (segmentId: string) => Segment|unknown|Promise<Segment|unknown>, resolvePoint: (pointId: string) => Point|unknown|Promise<Point|unknown>}} options Selected assignments and record resolvers.
 * @returns {Promise<Array<{startTimestamp: string, endTimestamp: string}>>} Commitment intervals.
 */
export async function projectRunnerCommitments({
  assignments,
  selectAssignments,
  resolveSegment,
  resolvePoint,
}) {
  if (!Array.isArray(assignments)) throw new Error('invalid-assignments');
  const matching = selectAssignments(assignments);
  const projected = [];
  for (const assignment of matching) {
    const segmentId = usableId(assignment.segmentId);
    if (!segmentId) throw new Error('missing-segment-id');
    const segment = await resolveSegment(segmentId);
    if (!segment || typeof segment !== 'object')
      throw new Error('missing-segment');
    const resolvedSegment = /** @type {Segment} */ (segment);
    const startPointId = usableId(resolvedSegment.startPointId);
    const endPointId = usableId(resolvedSegment.endPointId);
    if (!startPointId) throw new Error('missing-start-point-id');
    if (!endPointId) throw new Error('missing-end-point-id');
    const [startPoint, endPoint] = await Promise.all([
      resolvePoint(startPointId),
      resolvePoint(endPointId),
    ]);
    const resolvedStartPoint = /** @type {Point|null} */ (startPoint);
    const resolvedEndPoint = /** @type {Point|null} */ (endPoint);
    const startTimestamp = usableTimestamp(resolvedStartPoint?.timestamp);
    const endTimestamp = usableTimestamp(resolvedEndPoint?.timestamp);
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

/**
 * Build a denormalized read record for one runner assignment.
 * @param {string} assignmentId Assignment document identifier.
 * @param {Assignment|null|undefined} assignment Source assignment.
 * @param {Segment|null|undefined} segment Resolved source segment.
 * @param {(pointId: string) => Point|null|undefined} resolvePoint Point lookup.
 * @returns {{assignmentId: string, personId: string, startTimestamp: string, endTimestamp: string}|null} Read model record, or null if sources are incomplete or invalid.
 */
export function buildRunnerCommitmentProjectionRecord(
  assignmentId,
  assignment,
  segment,
  resolvePoint
) {
  const personId = usableId(assignment?.personId);
  const startPointId = usableId(segment?.startPointId);
  const endPointId = usableId(segment?.endPointId);
  if (!usableId(assignmentId) || !personId || !startPointId || !endPointId) {
    return null;
  }
  const startTimestamp = usableTimestamp(resolvePoint(startPointId)?.timestamp);
  const endTimestamp = usableTimestamp(resolvePoint(endPointId)?.timestamp);
  if (
    !startTimestamp ||
    !endTimestamp ||
    Date.parse(endTimestamp) < Date.parse(startTimestamp)
  ) {
    return null;
  }
  const projection = {};
  Object.assign(projection, {
    assignmentId,
    personId,
    startTimestamp,
    endTimestamp,
  });
  return /** @type {{assignmentId: string, personId: string, startTimestamp: string, endTimestamp: string}} */ (
    projection
  );
}

/**
 * Validate and order records from the indexed projection query.
 * @param {Array<{personId?: unknown, startTimestamp?: unknown, endTimestamp?: unknown}>} records Indexed projection records.
 * @param {string} runnerId Requested runner identifier.
 * @returns {Array<{startTimestamp: string, endTimestamp: string}>} Validated commitment intervals.
 */
export function selectRunnerCommitmentProjection(records, runnerId) {
  if (!Array.isArray(records)) throw new Error('invalid-projection-records');
  const intervals = [];
  for (const record of records) {
    if (record?.personId !== runnerId) throw new Error('invalid-person-id');
    const startTimestamp = usableTimestamp(record.startTimestamp);
    const endTimestamp = usableTimestamp(record.endTimestamp);
    if (!startTimestamp) throw new Error('invalid-start-timestamp');
    if (!endTimestamp) throw new Error('invalid-end-timestamp');
    if (Date.parse(endTimestamp) < Date.parse(startTimestamp)) {
      throw new Error('reversed-commitment-interval');
    }
    intervals.push({ startTimestamp, endTimestamp });
  }
  return intervals.sort(compareIntervals);
}
