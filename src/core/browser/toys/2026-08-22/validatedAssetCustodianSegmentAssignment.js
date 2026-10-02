// Toy: Validated Asset Custodian Segment Assignment
import { evaluateWorldLine } from '../2026-08-21/segmentAssignmentFeasibilityCore.js';
import {
  commitAssetCustodianAssignment,
  formatCommitFailure,
} from '../2026-08-21/safeAssignmentPersistence.js';
import {
  normalizeAssignmentId,
  resolveSpeed,
  evaluateRunnerWorldLine,
  assignmentErrorReason,
  findCoveringShift,
} from './strictAssignmentCore.js';

/**
 * @param {string} input JSON combined assignment request.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Strict atomic result.
 */
export function validatedAssetCustodianSegmentAssignment(input, env) {
  try {
    const x = JSON.parse(input || '{}'),
      assetId = normalizeAssignmentId(x.assetId),
      personId = normalizeAssignmentId(x.custodianPersonId),
      segmentId = normalizeAssignmentId(x.candidateSegment?.segmentId);
    if (!assetId) return formatCommitFailure('invalid-asset-id');
    if (!personId) return formatCommitFailure('invalid-custodian-person-id');
    if (!segmentId) return formatCommitFailure('invalid-segment-id');
    const speed = resolveSpeed(x);
    if (speed.requiredSpeed > speed.maximumSpeed)
      return formatCommitFailure('runner:excessive-speed');
    const asset = evaluateWorldLine(
      x.points,
      x.existingAssetSegments || [],
      x.candidateSegment,
      x.stockInPoint,
      x.stockOutPoint
    );
    if (!asset.feasible) return formatCommitFailure(`asset:${asset.reason}`);
    const candidate = speed.candidate;
    /** @type {Array<Record<string, any>>} */
    const shifts = x.shifts || [];
    const matching = findCoveringShift(shifts, candidate);
    if (!matching) return formatCommitFailure('runner:outside-shift');
    const runner = evaluateRunnerWorldLine(
      { ...x, existingSegments: x.existingPersonSegments || [] },
      matching
    );
    if (!runner.feasible) return formatCommitFailure(`runner:${runner.reason}`);
    return commitAssetCustodianAssignment(
      x,
      { assetId, personId, segmentId },
      env
    );
  } catch (error) {
    return formatCommitFailure(assignmentErrorReason(error));
  }
}
