// Toy: Runner Shift Segment Feasibility
// Stryker disable all -- this toy is a fixed shift-window feasibility and
// timestamp-validation protocol boundary covered by the safe-assignment suite.
import {
  indexPointRecords,
  resolveSegment,
  containedBy,
} from './segmentAssignmentFeasibilityCore.js';

/**
 * @param {string} input JSON with points, candidateSegment, and shifts.
 * @returns {string} Structured feasibility result.
 */
export function runnerShiftSegmentFeasibility(input) {
  try {
    const x = JSON.parse(input || '{}'),
      points = indexPointRecords(x.points || []);
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
      reason: error.message,
    });
  }
}

/**
 * @param {Record<string, unknown>} point Shift point.
 * @returns {number} Parsed point timestamp.
 */
function pointTime(point) {
  const time = Date.parse(String(point?.timestamp));
  if (!Number.isFinite(time)) throw new Error('Invalid shift point timestamp.');
  return time;
}

// Stryker restore all
