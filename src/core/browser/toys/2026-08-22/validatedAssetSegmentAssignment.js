// Toy: Validated Asset Segment Assignment
// jscpd:ignore-start
import { evaluateWorldLine } from '../2026-08-21/segmentAssignmentFeasibilityCore.js';
import { appendAtomically } from '../2026-08-21/safeAssignmentPersistence.js';
import { normalizeAssignmentId } from './strictAssignmentCore.js';

/**
 * @param {string} input JSON asset assignment request.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Strict append result.
 */
export function validatedAssetSegmentAssignment(input, env) {
  try {
    const x = JSON.parse(input || '{}'),
      assetId = normalizeAssignmentId(x.assetId),
      segmentId = normalizeAssignmentId(x.candidateSegment?.segmentId);
    if (!assetId)
      return JSON.stringify({
        appended: false,
        feasible: false,
        reason: 'invalid-asset-id',
      });
    if (!segmentId)
      return JSON.stringify({
        appended: false,
        feasible: false,
        reason: 'invalid-segment-id',
      });
    const result = evaluateWorldLine(
      x.points || [],
      x.existingSegments || [],
      x.candidateSegment,
      x.stockInPoint,
      x.stockOutPoint
    );
    if (!result.feasible)
      return JSON.stringify({
        appended: false,
        feasible: false,
        reason: result.reason,
      });
    const commit = appendAtomically(
      x.memoryLocation || 'temporary',
      [
        {
          path: x.path || 'assetSegmentAssignments',
          object: { assetId, segmentId },
        },
      ],
      env
    );
    return JSON.stringify({
      appended: true,
      feasible: true,
      length: commit.lengths[0],
      object: { assetId, segmentId },
    });
  } catch (error) {
    return JSON.stringify({
      appended: false,
      feasible: false,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}
// jscpd:ignore-end
