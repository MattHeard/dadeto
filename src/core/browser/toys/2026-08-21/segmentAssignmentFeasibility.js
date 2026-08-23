// Toy: Segment Assignment Feasibility
import { evaluateWorldLine } from './segmentAssignmentFeasibilityCore.js';

/** @param {string} input JSON with points, existingSegments, candidateSegment, entryPoint, and optional exitPoint. @returns {string} Structured feasibility result. */
export function segmentAssignmentFeasibility(input) {
  try {
    const x = JSON.parse(input || '{}');
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
  } catch (error) {
    return JSON.stringify({
      feasible: false,
      reason: error.message,
    });
  }
}
