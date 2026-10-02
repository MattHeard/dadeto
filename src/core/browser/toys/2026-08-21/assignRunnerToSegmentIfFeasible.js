// Toy: Assign Runner to Segment if Feasible
import {
  indexPointRecords,
  evaluateWorldLine,
  resolveSegment,
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
  try {
    const x = JSON.parse(input),
      points = indexPointRecords(x.points || []);
    const candidate = resolveSegment(
      new Map([[String(x.candidateSegment?.segmentId), x.candidateSegment]]),
      points,
      x.candidateSegment?.segmentId
    );
    const shifts = /** @type {Array<Record<string, any>>} */ (x.shifts || []);
    const matching = shifts.find(
      /**
       * @param {Record<string, any>} shift Shift record.
       * @returns {boolean} Whether the segment fits.
       */
      shift =>
        candidate.startTime >= Date.parse(shift.clockInPoint.timestamp) &&
        candidate.endTime <= Date.parse(shift.clockOutPoint.timestamp)
    );
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
  } catch (error) {
    return formatAssignmentFailure(error.message);
  }
}
