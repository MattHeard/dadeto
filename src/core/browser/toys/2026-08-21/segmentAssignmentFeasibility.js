// Toy: Segment Assignment Feasibility
import {
  evaluateWorldLine,
  legacyFeasibilityBoundary,
} from './segmentAssignmentFeasibilityCore.js';

/**
 * @param {string} input JSON with points, existingSegments, candidateSegment, entryPoint, and optional exitPoint.
 * @returns {string} Structured feasibility result.
 */
export function segmentAssignmentFeasibility(input) {
  return legacyFeasibilityBoundary(input, calculateWorldLine);
}

/**
 * Evaluate the world line with legacy optional-collection defaults.
 * @param {Record<string, any>} x Parsed request.
 * @returns {string} Serialized world-line outcome.
 */
function calculateWorldLine(x) {
  return JSON.stringify(
    evaluateWorldLine(
      x.points || [],
      x.existingSegments || [],
      x.candidateSegment,
      x.entryPoint,
      x.exitPoint,
      x.spacePoints || []
    )
  );
}
