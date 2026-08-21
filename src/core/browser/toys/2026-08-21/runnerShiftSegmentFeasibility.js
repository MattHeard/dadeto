// Toy: Runner Shift Segment Feasibility
// jscpd:ignore-start
/* eslint-disable jsdoc/require-returns, jsdoc/require-param-description, jsdoc/require-param-type */
import {
  resolveSegment,
  containedBy,
} from './segmentAssignmentFeasibilityCore.js';

/** @param {string} input JSON with points, candidateSegment, and shifts. @returns {string} Structured feasibility result. */
export function runnerShiftSegmentFeasibility(input) {
  try {
    const x = JSON.parse(input || '{}'),
      points = new Map(
        (x.points || []).map(point => [String(point.pointId), point])
      );
    const candidate = resolveSegment(
      new Map([[String(x.candidateSegment?.segmentId), x.candidateSegment]]),
      points,
      x.candidateSegment?.segmentId
    );
    for (const [index, shift] of (x.shifts || []).entries()) {
      const clockIn = pointTime(shift.clockInPoint),
        clockOut = pointTime(shift.clockOutPoint);
      if (
        clockOut >= clockIn &&
        containedBy(candidate, { startTime: clockIn, endTime: clockOut })
      )
        return JSON.stringify({
          feasible: true,
          shiftIndex: index,
          shiftId: shift.shiftId,
        });
    }
    return JSON.stringify({ feasible: false, reason: 'outside-shift' });
  } catch (error) {
    return JSON.stringify({
      feasible: false,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}
/**
 *
 * @param point
 */
function pointTime(point) {
  const time = Date.parse(String(point?.timestamp));
  if (!Number.isFinite(time)) throw new Error('Invalid shift point timestamp.');
  return time;
}
// jscpd:ignore-end
