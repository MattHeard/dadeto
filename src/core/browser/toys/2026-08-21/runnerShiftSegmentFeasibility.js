// Toy: Runner Shift Segment Feasibility
/* istanbul ignore file -- exercised through the toy integration suite. */
// jscpd:ignore-start
/* eslint-disable jsdoc/require-returns, jsdoc/require-param-description */
import {
  resolveSegment,
  containedBy,
} from './segmentAssignmentFeasibilityCore.js';

/** @param {string} input JSON with points, candidateSegment, and shifts. @returns {string} Structured feasibility result. */
export function runnerShiftSegmentFeasibility(input) {
  try {
    const x = JSON.parse(input || '{}'),
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
    for (const [index, shift] of /** @type {Array<Record<string, unknown>>} */ (
      x.shifts || []
    ).entries()) {
      const clockIn = pointTime(
          /** @type {Record<string, unknown>} */ (shift.clockInPoint)
        ),
        clockOut = pointTime(
          /** @type {Record<string, unknown>} */ (shift.clockOutPoint)
        );
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
 * @param {Record<string, unknown>} point
 */
function pointTime(point) {
  const time = Date.parse(String(point?.timestamp));
  if (!Number.isFinite(time)) throw new Error('Invalid shift point timestamp.');
  return time;
}
// jscpd:ignore-end
