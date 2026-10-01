// Toy: Validated Runner Segment Assignment
import {
  evaluateRunnerWorldLine,
  normalizeAssignmentId,
  resolveSpeed,
  assignmentErrorReason,
  formatAssignmentFailure,
  findCoveringShift,
} from './strictAssignmentCore.js';
import { appendOneAssignment } from '../2026-08-21/safeAssignmentPersistence.js';

/**
 * @param {string} input JSON runner assignment request.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Strict append result.
 */
export function validatedRunnerSegmentAssignment(input, env) {
  try {
    const x = JSON.parse(input || '{}'),
      personId = normalizeAssignmentId(x.personId),
      segmentId = normalizeAssignmentId(x.candidateSegment?.segmentId);
    if (!personId) return formatAssignmentFailure('invalid-person-id');
    if (!segmentId) return formatAssignmentFailure('invalid-segment-id');
    const speed = resolveSpeed(x);
    const candidate = speed.candidate;
    /** @type {Array<Record<string, any>>} */
    const shifts = x.shifts || [];
    const matching = findCoveringShift(shifts, candidate);
    if (!matching) return formatAssignmentFailure('outside-shift');
    if (speed.requiredSpeed > speed.maximumSpeed)
      return formatAssignmentFailure('excessive-speed');
    const result = evaluateRunnerWorldLine(x, matching);
    if (!result.feasible) return formatAssignmentFailure(result.reason);
    const length = appendOneAssignment(
      x,
      { personId, segmentId },
      'personSegmentAssignments',
      env
    );
    return JSON.stringify({
      appended: true,
      feasible: true,
      length,
      shiftId: matching.shiftId,
    });
  } catch (error) {
    return formatAssignmentFailure(assignmentErrorReason(error));
  }
}
