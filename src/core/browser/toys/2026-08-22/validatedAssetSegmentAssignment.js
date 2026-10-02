// Toy: Validated Asset Segment Assignment
import {
  normalizeAssignmentId,
  strictAssignmentBoundary,
  formatAssignmentFailure,
  evaluateStockWorldLine,
} from './strictAssignmentCore.js';

/**
 * @param {string} input JSON asset assignment request.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Strict append result.
 */
export function validatedAssetSegmentAssignment(input, env) {
  return strictAssignmentBoundary(input, env, x => {
    const assetId = normalizeAssignmentId(x.assetId),
      segmentId = normalizeAssignmentId(x.candidateSegment?.segmentId);
    if (!assetId) return formatAssignmentFailure('invalid-asset-id');
    if (!segmentId) return formatAssignmentFailure('invalid-segment-id');
    const result = evaluateStockWorldLine(
      x,
      x.points || [],
      x.existingSegments
    );
    return {
      feasibility: result,
      request: x,
      assignment: { assetId, segmentId },
      path: 'assetSegmentAssignments',
      metadata: { object: { assetId, segmentId } },
    };
  });
}
