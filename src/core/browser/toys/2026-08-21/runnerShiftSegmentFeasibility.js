// Toy: Runner Shift Segment Feasibility
import {
  indexPointRecords,
  resolveCandidateSegment,
  containedBy,
  legacyFeasibilityBoundary,
} from './segmentAssignmentFeasibilityCore.js';

/**
 * @param {string} input JSON with points, candidateSegment, and shifts.
 * @returns {string} Structured feasibility result.
 */
export function runnerShiftSegmentFeasibility(input) {
  return legacyFeasibilityBoundary(input, calculateShiftCoverage);
}

/**
 * Select the first valid shift containing the candidate interval.
 * @param {Record<string, any>} x Parsed shift request.
 * @returns {string} Coverage result with the original shift identity.
 */
function calculateShiftCoverage(x) {
  const points = indexPointRecords(x.points || []);
  const candidate = resolveCandidateSegment(x.candidateSegment, points);
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
