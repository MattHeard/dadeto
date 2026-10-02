// Toy: Validated Runner Segment Assignment
import {
  evaluateRunnerWorldLine,
  normalizeAssignmentId,
  resolveSpeed,
  strictAssignmentBoundary,
  formatAssignmentFailure,
  findAssignmentShift,
} from './strictAssignmentCore.js';

/**
 * @param {string} input JSON runner assignment request.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Strict append result.
 */
export function validatedRunnerSegmentAssignment(input, env) {
  return strictAssignmentBoundary(input, env, x => {
    const personId = normalizeAssignmentId(x.personId),
      segmentId = normalizeAssignmentId(x.candidateSegment?.segmentId);
    if (!personId) return formatAssignmentFailure('invalid-person-id');
    if (!segmentId) return formatAssignmentFailure('invalid-segment-id');
    const speed = resolveSpeed(x);
    const matching = findAssignmentShift(x, speed.candidate);
    if (!matching) return formatAssignmentFailure('outside-shift');
    if (speed.requiredSpeed > speed.maximumSpeed)
      return formatAssignmentFailure('excessive-speed');
    const result = evaluateRunnerWorldLine(x, matching);
    return {
      feasibility: result,
      request: x,
      assignment: { personId, segmentId },
      path: 'personSegmentAssignments',
      metadata: { shiftId: matching.shiftId },
    };
  });
}
