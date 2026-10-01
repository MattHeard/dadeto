// Toy: Validated Asset Segment Assignment
import { evaluateWorldLine } from '../2026-08-21/segmentAssignmentFeasibilityCore.js';
import { appendOneAssignment } from '../2026-08-21/safeAssignmentPersistence.js';
import {
  normalizeAssignmentId,
  assignmentErrorReason,
  formatAssignmentFailure,
} from './strictAssignmentCore.js';

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
    if (!assetId) return formatAssignmentFailure('invalid-asset-id');
    if (!segmentId) return formatAssignmentFailure('invalid-segment-id');
    const result = evaluateWorldLine(
      x.points || [],
      x.existingSegments || [],
      x.candidateSegment,
      x.stockInPoint,
      x.stockOutPoint
    );
    if (!result.feasible) return formatAssignmentFailure(result.reason);
    const length = appendOneAssignment(
      x,
      { assetId, segmentId },
      'assetSegmentAssignments',
      env
    );
    return JSON.stringify({
      appended: true,
      feasible: true,
      length,
      object: { assetId, segmentId },
    });
  } catch (error) {
    return formatAssignmentFailure(assignmentErrorReason(error));
  }
}
