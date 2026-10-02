// Toy: Assign Asset to Segment if Feasible
import { evaluateWorldLine } from './segmentAssignmentFeasibilityCore.js';
import {
  appendValidatedAssignment,
  formatAssignmentFailure,
} from '../2026-08-22/strictAssignmentCore.js';

/**
 * @param {string} input JSON asset assignment request.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Append result.
 */
export function assignAssetToSegmentIfFeasible(input, env) {
  try {
    const x = JSON.parse(input),
      result = evaluateWorldLine(
        x.points || [],
        x.existingSegments || [],
        x.candidateSegment,
        x.stockInPoint,
        x.stockOutPoint,
        x.spacePoints || []
      );
    if (!result.feasible) return formatAssignmentFailure(result.reason);
    return appendValidatedAssignment(
      {
        request: x,
        assignment: {
          assetId: String(x.assetId || ''),
          segmentId: String(x.candidateSegment.segmentId),
        },
        path: 'assetSegmentAssignments',
        metadata: {
          object: {
            assetId: x.assetId,
            segmentId: x.candidateSegment.segmentId,
          },
        },
        feasibility: result,
      },
      env
    );
  } catch (error) {
    return formatAssignmentFailure(error.message);
  }
}
