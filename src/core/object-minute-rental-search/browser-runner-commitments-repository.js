import { projectRunnerCommitments } from './runner-commitments.js';

/** @typedef {{segmentId?: unknown}} SegmentRecord */
/** @typedef {{pointId?: unknown}} PointRecord */

/**
 * Create a browser/in-memory runner commitments repository.
 * @param {{runnerAssignments?: object[], segments?: SegmentRecord[], spacetimePoints?: PointRecord[]}} [records] Resolved records.
 * @returns {{listForRunner: (options: {runnerId: string}) => Promise<Array<{startTimestamp: string, endTimestamp: string}>>}} Repository capability.
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
    listForRunner: ({ runnerId }) =>
      projectRunnerCommitments({
        runnerId,
        assignments: runnerAssignments,
        resolveSegment: segmentId => segmentById.get(segmentId),
        resolvePoint: pointId => pointById.get(pointId),
      }),
  };
}
