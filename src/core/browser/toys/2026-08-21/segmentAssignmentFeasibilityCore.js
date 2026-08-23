// Shared pure feasibility helpers for safe segment assignment toys.
import { resolvePointRecords } from '../2026-08-22/spacePointResolution.js';

/**
 * Resolve and validate a segment.
 * @param {Map<string, Record<string, unknown>>} segments Segment records.
 * @param {Map<string, Record<string, unknown>>} points Point records.
 * @param {string} segmentId Segment ID.
 * @returns {{segmentId: string, startPointId: string, endPointId: string, startTime: number, endTime: number, start: Record<string, unknown>, end: Record<string, unknown>}} Resolved segment.
 */
export function resolveSegment(segments, points, segmentId) {
  const segment = segments.get(segmentId);
  if (!segment) throw new Error(`Unknown segment: ${segmentId}`);
  const start = points.get(String(segment.startPointId));
  const end = points.get(String(segment.endPointId));
  if (!start || !end)
    throw new Error(`Segment ${segmentId} references an unknown point.`);
  const startTime = Date.parse(String(start.timestamp));
  const endTime = Date.parse(String(end.timestamp));
  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    endTime < startTime
  )
    throw new Error(
      `Segment ${segmentId} must have an ordered valid interval.`
    );
  return {
    segmentId,
    startPointId: String(segment.startPointId),
    endPointId: String(segment.endPointId),
    startTime,
    endTime,
    start,
    end,
  };
}

/**
 * Determine whether a candidate fits a bounded entity world line.
 * @param {Array<Record<string, unknown>>} pointsInput Resolved points.
 * @param {Array<Record<string, unknown>>} existingSegments Existing segments.
 * @param {Record<string, unknown>} candidateSegment Candidate segment.
 * @param {Record<string, unknown>} entryPoint Entry anchor.
 * @param {Record<string, unknown>|undefined} exitPoint Optional exit anchor.
 * @param {Array<Record<string, unknown>>} spacePointsInput
 * @returns {{feasible: boolean, reason?: string}} Feasibility result.
 */
export function evaluateWorldLine(
  pointsInput,
  existingSegments,
  candidateSegment,
  entryPoint,
  exitPoint,
  spacePointsInput = []
) {
  return evaluateWorldLineMany(
    pointsInput,
    existingSegments,
    [candidateSegment],
    entryPoint,
    exitPoint,
    spacePointsInput
  );
}

/**
 * Determine whether multiple candidate segments fit one bounded world line.
 * @param {Array<Record<string, unknown>>} pointsInput Resolved points.
 * @param {Array<Record<string, unknown>>} existingSegments Existing segments.
 * @param {Array<Record<string, unknown>>} candidateSegments Candidate segments.
 * @param {Record<string, unknown>} entryPoint Entry anchor.
 * @param {Record<string, unknown>|undefined} exitPoint Optional exit anchor.
 * @param {Array<Record<string, unknown>>} spacePointsInput Space points.
 * @returns {{feasible: boolean, reason?: string}} Feasibility result.
 */
export function evaluateWorldLineMany(
  pointsInput,
  existingSegments,
  candidateSegments,
  entryPoint,
  exitPoint,
  spacePointsInput = []
) {
  try {
    const points = new Map(
      resolvePointRecords(pointsInput, spacePointsInput).map(point => [
        String(point.pointId),
        point,
      ])
    );
    if (!entryPoint?.pointId)
      return { feasible: false, reason: 'missing-entry-point' };
    points.set(String(entryPoint.pointId), entryPoint);
    if (exitPoint?.pointId) points.set(String(exitPoint.pointId), exitPoint);
    if (!Array.isArray(candidateSegments) || candidateSegments.length === 0)
      return { feasible: false, reason: 'missing-candidate-segments' };
    if (candidateSegments.some(segment => !segment?.segmentId))
      return { feasible: false, reason: 'invalid-candidate-segment' };
    const candidateIds = candidateSegments.map(segment =>
      String(segment.segmentId)
    );
    if (new Set(candidateIds).size !== candidateIds.length)
      return { feasible: false, reason: 'duplicate-candidate-segment' };
    const existingIds = new Set(
      existingSegments.map(segment => String(segment?.segmentId))
    );
    if (candidateIds.some(id => existingIds.has(id)))
      return { feasible: false, reason: 'duplicate-segment' };
    const segments = new Map(
      [...existingSegments, ...candidateSegments].map(segment => [
        String(segment.segmentId),
        segment,
      ])
    );
    const resolved = [...segments.keys()]
      .map(id => resolveSegment(segments, points, id))
      .sort(
        (a, b) =>
          a.startTime - b.startTime || a.segmentId.localeCompare(b.segmentId)
      );
    // resolveSegment above throws unless the candidate contributes a segment.
    const entryTime = Date.parse(String(entryPoint.timestamp));
    if (!Number.isFinite(entryTime))
      return { feasible: false, reason: 'invalid-entry-point' };
    if (resolved[0].startTime < entryTime)
      return { feasible: false, reason: 'before-entry' };
    if (!bridge(entryPoint, resolved[0], entryTime))
      return { feasible: false, reason: 'entry-discontinuity' };
    for (let index = 1; index < resolved.length; index++) {
      const previous = resolved[index - 1],
        next = resolved[index];
      if (previous.endTime > next.startTime)
        return { feasible: false, reason: 'temporal-overlap' };
      if (!bridge(previous.end, next, previous.endTime))
        return { feasible: false, reason: 'world-line-discontinuity' };
    }
    if (exitPoint) {
      const exitTime = Date.parse(String(exitPoint.timestamp));
      if (!Number.isFinite(exitTime))
        return { feasible: false, reason: 'invalid-exit-point' };
      const last = resolved[resolved.length - 1];
      if (last.endTime > exitTime)
        return { feasible: false, reason: 'after-exit' };
      if (!bridge(last.end, exitPoint, last.endTime))
        return { feasible: false, reason: 'exit-discontinuity' };
    }
    return { feasible: true };
  } catch (error) {
    return {
      feasible: false,
      reason: error.message,
    };
  }
}

/**
 *
 * @param {Record<string, any>} previousPoint
 * @param {Record<string, any>} nextSegmentOrPoint
 * @param {number} previousTime
 */
function bridge(previousPoint, nextSegmentOrPoint, previousTime) {
  const nextTime =
    nextSegmentOrPoint.startTime ??
    Date.parse(String(nextSegmentOrPoint.timestamp));
  if (previousTime === nextTime)
    return (
      previousPoint.pointId === nextSegmentOrPoint.startPointId ||
      previousPoint.pointId === nextSegmentOrPoint.pointId
    );
  return sameLocation(
    previousPoint,
    nextSegmentOrPoint.start ?? nextSegmentOrPoint
  );
}

/**
 *
 * @param {Record<string, any>} first
 * @param {Record<string, any>} second
 */
function sameLocation(first, second) {
  return (
    Number(first.latitude) === Number(second.latitude) &&
    Number(first.longitude) === Number(second.longitude)
  );
}

/**
 * @param {{startTime: number, endTime: number}} interval Candidate interval. @param {{startTime: number, endTime: number}} shift Shift interval. @returns {boolean} Whether shift contains interval.
 * @param shift
 */
export function containedBy(interval, shift) {
  return (
    interval.startTime >= shift.startTime && interval.endTime <= shift.endTime
  );
}

/**
 * @param {{startTime: number, endTime: number}} first First interval. @param {{startTime: number, endTime: number}} second Second interval. @returns {boolean} Whether positive-duration overlap exists.
 * @param second
 */
export function overlaps(first, second) {
  return (
    Math.max(first.startTime, second.startTime) <
    Math.min(first.endTime, second.endTime)
  );
}
