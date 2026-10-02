import { legacyAssignmentBoundary } from './safeAssignmentPersistence.js';
// Toy: Assign Runner to Segment if Feasible
import {
  resolveLegacyRunnerShift,
  evaluateWorldLine,
  measureSegmentMotion,
} from './segmentAssignmentFeasibilityCore.js';
import {
  appendValidatedAssignment,
  formatAssignmentFailure,
} from '../2026-08-22/strictAssignmentCore.js';

/**
 * @param {string} input JSON runner assignment request.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Append result.
 */
export function assignRunnerToSegmentIfFeasible(input, env) {
  return legacyAssignmentBoundary(
    input,
    env,
    x => {
      const { candidate, matching } = resolveLegacyRunnerShift(x);
      if (!matching) return formatAssignmentFailure('outside-shift');
      const { requiredSpeed: required } = measureSegmentMotion(candidate);
      if (required > Number(x.maximumSpeedKilometersPerHour))
        return formatAssignmentFailure('excessive-speed');
      const result = evaluateWorldLine(
        x.points,
        x.existingSegments || [],
        x.candidateSegment,
        matching.clockInPoint,
        matching.clockOutPoint,
        x.spacePoints || []
      );
      if (!result.feasible) return formatAssignmentFailure(result.reason);
      return appendValidatedAssignment(
        {
          request: x,
          assignment: {
            personId: String(x.personId || ''),
            segmentId: String(x.candidateSegment.segmentId),
          },
          path: 'personSegmentAssignments',
          metadata: { shiftId: matching.shiftId },
          feasibility: result,
        },
        env
      );
    },
    formatAssignmentFailure
  );
}
