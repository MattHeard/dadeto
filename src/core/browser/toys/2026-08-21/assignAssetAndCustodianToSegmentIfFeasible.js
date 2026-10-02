// Toy: Assign Asset and Custodian to Segment if Feasible
import {
  resolveLegacyRunnerShift,
  evaluateWorldLine,
  measureSegmentMotion,
} from './segmentAssignmentFeasibilityCore.js';
import {
  legacyAssignmentBoundary,
  commitAssetCustodianAssignment,
  formatCommitFailure,
} from './safeAssignmentPersistence.js';

/**
 * @param {string} input JSON combined assignment request.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Transaction result.
 */
export function assignAssetAndCustodianToSegmentIfFeasible(input, env) {
  return legacyAssignmentBoundary(
    input,
    env,
    x => {
      const { candidate, matching } = resolveLegacyRunnerShift(x);
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
    },
    formatCommitFailure
  );
}
