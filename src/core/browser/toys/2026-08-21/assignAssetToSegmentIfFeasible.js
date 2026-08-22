// Toy: Assign Asset to Segment if Feasible
// jscpd:ignore-start
/* eslint-disable jsdoc/require-returns, jsdoc/require-param-description, jsdoc/require-param-type */
import { evaluateWorldLine } from './segmentAssignmentFeasibilityCore.js';
import { appendAtomically } from './safeAssignmentPersistence.js';

/**
 * @param {string} input JSON asset assignment request. @param {import('../browserToysCore.js').ToyEnv} env Storage helpers. @returns {string} Append result.
 * @param env
 */
export function assignAssetToSegmentIfFeasible(input, env) {
  try {
    const x = JSON.parse(input),
      result = evaluateWorldLine(
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
          object: {
            assetId: String(x.assetId || ''),
            segmentId: String(x.candidateSegment.segmentId),
          },
        },
      ],
      env
    );
    return JSON.stringify({
      appended: true,
      feasible: true,
      length: commit.lengths[0],
      object: { assetId: x.assetId, segmentId: x.candidateSegment.segmentId },
    });
  } catch (error) {
    return JSON.stringify({
      appended: false,
      feasible: false,
      reason: error.message,
    });
  }
}
// jscpd:ignore-end
