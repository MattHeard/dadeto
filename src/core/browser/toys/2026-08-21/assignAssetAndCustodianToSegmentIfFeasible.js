// Toy: Assign Asset and Custodian to Segment if Feasible
import {
  evaluateWorldLine,
  resolveSegment,
  measureSegmentMotion,
} from './segmentAssignmentFeasibilityCore.js';
import {
  commitAssetCustodianAssignment,
  formatCommitFailure,
} from './safeAssignmentPersistence.js';

/**
 * @param {string} input JSON combined assignment request.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Transaction result.
 */
export function assignAssetAndCustodianToSegmentIfFeasible(input, env) {
  try {
    const x = JSON.parse(input),
      points = new Map(
        /** @type {Array<Record<string, unknown>>} */ (x.points || []).map(
          /**
           * @param {Record<string, unknown>} point Point record.
           * @returns {[string, Record<string, unknown>]} Point map entry.
           */
          point => [String(point.pointId), point]
        )
      );
    const candidate = resolveSegment(
      new Map([[String(x.candidateSegment?.segmentId), x.candidateSegment]]),
      points,
      x.candidateSegment?.segmentId
    );
    const matching = /** @type {Array<Record<string, any>>} */ (
      x.shifts || []
    ).find(
      /**
       * @param {Record<string, any>} shift Shift record.
       * @returns {boolean} Whether the segment fits.
       */
      shift =>
        candidate.startTime >= Date.parse(shift.clockInPoint.timestamp) &&
        candidate.endTime <= Date.parse(shift.clockOutPoint.timestamp)
    );
    if (!matching) return formatCommitFailure('outside-shift');
    const assetResult = evaluateWorldLine(
      x.points,
      x.existingAssetSegments || [],
      x.candidateSegment,
      x.stockInPoint,
      x.stockOutPoint,
      x.spacePoints || []
    );
    if (!assetResult.feasible)
      return formatCommitFailure(`asset:${assetResult.reason}`);
    const runnerResult = evaluateWorldLine(
      x.points,
      x.existingPersonSegments || [],
      x.candidateSegment,
      matching.clockInPoint,
      matching.clockOutPoint,
      x.spacePoints || []
    );
    if (!runnerResult.feasible)
      return formatCommitFailure(`runner:${runnerResult.reason}`);
    const maximum = Number(x.maximumSpeedKilometersPerHour);
    const { requiredSpeed: required } = measureSegmentMotion(candidate, 0);
    if (!Number.isFinite(maximum) || required > maximum)
      return formatCommitFailure('excessive-speed');
    return commitAssetCustodianAssignment(
      x,
      {
        assetId: String(x.assetId),
        personId: String(x.custodianPersonId),
        segmentId: String(x.candidateSegment.segmentId),
      },
      env
    );
  } catch (error) {
    return formatCommitFailure(error.message);
  }
}
