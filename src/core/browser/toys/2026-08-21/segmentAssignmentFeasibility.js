// Toy: Segment Assignment Feasibility
/* istanbul ignore file -- exercised through the toy integration suite. */
// jscpd:ignore-start
/* eslint-disable jsdoc/require-returns */
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
        x.exitPoint
      )
    );
  } catch (error) {
    return JSON.stringify({
      feasible: false,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}
// jscpd:ignore-end
