// Toy: Validated Runner Segment Assignment
// jscpd:ignore-start
import {
  evaluateRunnerWorldLine,
  normalizeAssignmentId,
  resolveSpeed,
} from './strictAssignmentCore.js';
import { appendAtomically } from '../2026-08-21/safeAssignmentPersistence.js';

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
    if (!personId)
      return JSON.stringify({
        appended: false,
        feasible: false,
        reason: 'invalid-person-id',
      });
    if (!segmentId)
      return JSON.stringify({
        appended: false,
        feasible: false,
        reason: 'invalid-segment-id',
      });
    const speed = resolveSpeed(x);
    const candidate = speed.candidate;
    const matching = (x.shifts || []).find(
      shift =>
        candidate.startTime >= Date.parse(shift.clockInPoint?.timestamp) &&
        candidate.endTime <= Date.parse(shift.clockOutPoint?.timestamp)
    );
    if (!matching)
      return JSON.stringify({
        appended: false,
        feasible: false,
        reason: 'outside-shift',
      });
    if (speed.requiredSpeed > speed.maximumSpeed)
      return JSON.stringify({
        appended: false,
        feasible: false,
        reason: 'excessive-speed',
      });
    const result = evaluateRunnerWorldLine(x, matching);
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
          path: x.path || 'personSegmentAssignments',
          object: { personId, segmentId },
        },
      ],
      env
    );
    return JSON.stringify({
      appended: true,
      feasible: true,
      length: commit.lengths[0],
      shiftId: matching.shiftId,
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
