// Toy: Validated Asset Custodian Segment Assignment
import {
  commitAssetCustodianAssignment,
  formatCommitFailure,
} from '../2026-08-21/safeAssignmentPersistence.js';
import {
  normalizeAssignmentId,
  resolveSpeed,
  evaluateRunnerWorldLine,
  strictAssignmentBoundary,
  findAssignmentShift,
  evaluateStockWorldLine,
} from './strictAssignmentCore.js';

/**
 * @param {string} input JSON combined assignment request.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Strict atomic result.
 */
export function validatedAssetCustodianSegmentAssignment(input, env) {
  return strictAssignmentBoundary(
    input,
    env,
    x => {
      const assetId = normalizeAssignmentId(x.assetId),
        personId = normalizeAssignmentId(x.custodianPersonId),
        segmentId = normalizeAssignmentId(x.candidateSegment?.segmentId);
      if (!assetId) return formatCommitFailure('invalid-asset-id');
      if (!personId) return formatCommitFailure('invalid-custodian-person-id');
      if (!segmentId) return formatCommitFailure('invalid-segment-id');
      const speed = resolveSpeed(x);
      if (speed.requiredSpeed > speed.maximumSpeed)
        return formatCommitFailure('runner:excessive-speed');
      const asset = evaluateStockWorldLine(
        x,
        x.points,
        x.existingAssetSegments
      );
      if (!asset.feasible) return formatCommitFailure(`asset:${asset.reason}`);
      const matching = findAssignmentShift(x, speed.candidate);
      if (!matching) return formatCommitFailure('runner:outside-shift');
      const runner = evaluateRunnerWorldLine(
        { ...x, existingSegments: x.existingPersonSegments || [] },
        matching
      );
      if (!runner.feasible)
        return formatCommitFailure(`runner:${runner.reason}`);
      return commitAssetCustodianAssignment(
        x,
        { assetId, personId, segmentId },
        env
      );
    },
    formatCommitFailure
  );
}
