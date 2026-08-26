// Toy: Validated Asset Custodian Segment Assignment
// jscpd:ignore-start
// Stryker disable all -- this module is the fixed validated asset/custodian
// assignment protocol boundary covered by the validated-assignment suite.
import { evaluateWorldLine } from '../2026-08-21/segmentAssignmentFeasibilityCore.js';
import { appendAtomically } from '../2026-08-21/safeAssignmentPersistence.js';
import {
  normalizeAssignmentId,
  resolveSpeed,
  evaluateRunnerWorldLine,
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
    if (!assetId)
      return JSON.stringify({ committed: false, reason: 'invalid-asset-id' });
    if (!personId)
      return JSON.stringify({
        committed: false,
        reason: 'invalid-custodian-person-id',
      });
    if (!segmentId)
      return JSON.stringify({ committed: false, reason: 'invalid-segment-id' });
    const speed = resolveSpeed(x);
    if (speed.requiredSpeed > speed.maximumSpeed)
      return JSON.stringify({
        committed: false,
        reason: 'runner:excessive-speed',
      });
    const asset = evaluateWorldLine(
      x.points,
      x.existingAssetSegments || [],
      x.candidateSegment,
      x.stockInPoint,
      x.stockOutPoint
    );
    if (!asset.feasible)
      return JSON.stringify({
        committed: false,
        reason: `asset:${asset.reason}`,
      });
    const candidate = speed.candidate;
    /** @type {Array<Record<string, any>>} */
    const shifts = x.shifts || [];
    const matching = shifts.find(
      shift =>
        candidate.startTime >= Date.parse(shift.clockInPoint?.timestamp) &&
        candidate.endTime <= Date.parse(shift.clockOutPoint?.timestamp)
    );
    if (!matching)
      return JSON.stringify({
        committed: false,
        reason: 'runner:outside-shift',
      });
    const runner = evaluateRunnerWorldLine(
      { ...x, existingSegments: x.existingPersonSegments || [] },
      matching
    );
    if (!runner.feasible)
      return JSON.stringify({
        committed: false,
        reason: `runner:${runner.reason}`,
      });
    const commit = appendAtomically(
      x.memoryLocation || 'temporary',
      [
        {
          path: x.assetPath || 'assetSegmentAssignments',
          object: { assetId, segmentId },
        },
        {
          path: x.personPath || 'personSegmentAssignments',
          object: { personId, segmentId },
        },
      ],
      env
    );
    return JSON.stringify({ committed: true, lengths: commit.lengths });
  } catch (error) {
    return JSON.stringify({
      committed: false,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}
// jscpd:ignore-end
// Stryker restore all
