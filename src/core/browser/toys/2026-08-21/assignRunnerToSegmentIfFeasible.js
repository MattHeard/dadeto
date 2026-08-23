// Toy: Assign Runner to Segment if Feasible
import {
  evaluateWorldLine,
  resolveSegment,
} from './segmentAssignmentFeasibilityCore.js';
import { appendAtomically } from './safeAssignmentPersistence.js';
import { wgs84Distance } from '../2026-08-20/wgs84Distance.js';

/**
 * @param {string} input JSON runner assignment request. @param {import('../browserToysCore.js').ToyEnv} env Storage helpers. @returns {string} Append result.
 * @param env
 */
export function assignRunnerToSegmentIfFeasible(input, env) {
  try {
    const x = JSON.parse(input),
      points = new Map(
        /** @type {Array<Record<string, unknown>>} */ (x.points || []).map(
          /** @param {Record<string, unknown>} point */ point => [
            String(point.pointId),
            point,
          ]
        )
      );
    const candidate = resolveSegment(
      new Map([[String(x.candidateSegment?.segmentId), x.candidateSegment]]),
      points,
      x.candidateSegment?.segmentId
    );
    const shifts = /** @type {Array<Record<string, any>>} */ (x.shifts || []);
    const matching = shifts.find(
      /** @param {Record<string, any>} shift */
      shift =>
        candidate.startTime >= Date.parse(shift.clockInPoint.timestamp) &&
        candidate.endTime <= Date.parse(shift.clockOutPoint.timestamp)
    );
    if (!matching)
      return JSON.stringify({
        appended: false,
        feasible: false,
        reason: 'outside-shift',
      });
    const duration = (candidate.endTime - candidate.startTime) / 1000;
    const distance = wgs84Distance(
      Number(candidate.start.latitude),
      Number(candidate.start.longitude),
      Number(candidate.end.latitude),
      Number(candidate.end.longitude)
    );
    const required =
      duration === 0
        ? distance === 0
          ? 0
          : Infinity
        : distance / 1000 / (duration / 3600);
    if (required > Number(x.maximumSpeedKilometersPerHour))
      return JSON.stringify({
        appended: false,
        feasible: false,
        reason: 'excessive-speed',
      });
    const result = evaluateWorldLine(
      x.points,
      x.existingSegments || [],
      x.candidateSegment,
      matching.clockInPoint,
      matching.clockOutPoint,
      x.spacePoints || []
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
          path: x.path || 'personSegmentAssignments',
          object: {
            personId: String(x.personId || ''),
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
      shiftId: matching.shiftId,
    });
  } catch (error) {
    return JSON.stringify({
      appended: false,
      feasible: false,
      reason: error.message,
    });
  }
}
