// Shared pure feasibility helpers for safe segment assignment toys.
import {
  indexPointRecords as indexResolvedPointRecords,
  resolvePointRecords,
} from '../2026-08-22/spacePointResolution.js';
import { resolveSegmentTiming } from '../2026-08-20/assignmentIntervals.js';
export { resolveSegmentTiming } from '../2026-08-20/assignmentIntervals.js';
export { overlaps } from '../2026-08-20/assignmentIntervals.js';
import { wgs84Distance } from '../2026-08-20/wgs84Distance.js';
import { createToyMessageBoundary } from '../formatToyError.js';

const runFeasibilityCalculation = createToyMessageBoundary(
  { feasible: false },
  'reason',
  0
);

/**
 * Calculate segment speed in kilometres per hour without changing legacy policy.
 * @param {ReturnType<typeof resolveSegment>} candidate Resolved segment endpoints and timing.
 * @param {number} [movingAtZero] Moving-segment speed for zero time; legacy combined assignments explicitly use zero.
 * @returns {{distanceMeters: number, durationSeconds: number, requiredSpeed: number}} Segment motion measurements.
 */
export function measureSegmentMotion(candidate, movingAtZero = Infinity) {
  const distanceMeters = wgs84Distance(
    Number(candidate.start.latitude),
    Number(candidate.start.longitude),
    Number(candidate.end.latitude),
    Number(candidate.end.longitude)
  );
  const durationSeconds = (candidate.endTime - candidate.startTime) / 1000;
  const requiredSpeed =
    durationSeconds === 0
      ? distanceMeters === 0
        ? 0
        : movingAtZero
      : distanceMeters / 1000 / (durationSeconds / 3600);
  return { distanceMeters, durationSeconds, requiredSpeed };
}

/**
 * Index point records by point ID.
 * @param {Array<Record<string, unknown>>} points Point records.
 * @returns {Map<string, Record<string, unknown>>} Point index.
 */
export function indexPointRecords(points) {
  return indexResolvedPointRecords(points, point => String(point.pointId));
}

/**
 * Resolve one request candidate without changing its legacy ID lookup policy.
 * @param {Record<string, unknown> | undefined} candidate Candidate segment record.
 * @param {Map<string, Record<string, unknown>>} points Prepared point index.
 * @returns {ReturnType<typeof resolveSegment>} Resolved candidate.
 */
export function resolveCandidateSegment(candidate, points) {
  return resolveSegment(
    new Map([[String(candidate?.segmentId), candidate]]),
    points,
    /** @type {string} */ (candidate?.segmentId)
  );
}

/**
 * Resolve a legacy runner candidate and its first covering authored shift.
 * @param {Record<string, any>} request Legacy assignment request.
 * @returns {{candidate: ReturnType<typeof resolveCandidateSegment>, matching: Record<string, any> | undefined}} Candidate and matching shift.
 */
export function resolveLegacyRunnerShift(request) {
  const candidate = resolveCandidateSegment(
    request.candidateSegment,
    indexPointRecords(request.points || [])
  );
  const shifts = /** @type {Array<Record<string, any>>} */ (
    request.shifts || []
  );
  const matching = shifts.find(
    shift =>
      candidate.startTime >= Date.parse(shift.clockInPoint.timestamp) &&
      candidate.endTime <= Date.parse(shift.clockOutPoint.timestamp)
  );
  return { candidate, matching };
}

/**
 * Resolve and validate a segment.
 * @param {Map<string, Record<string, unknown> | undefined>} segments Segment records.
 * @param {Map<string, Record<string, unknown>>} points Point records.
 * @param {string} segmentId Segment ID.
 * @returns {{segmentId: string, startPointId: string, endPointId: string, startTime: number, endTime: number, start: Record<string, unknown>, end: Record<string, unknown>}} Resolved segment.
 */
export function resolveSegment(segments, points, segmentId) {
  const timing = resolveSegmentTiming(segments, points, segmentId);
  return {
    segmentId,
    startPointId: timing.startPointId,
    endPointId: timing.endPointId,
    startTime: timing.startTime,
    endTime: timing.endTime,
    start: timing.start,
    end: timing.end,
  };
}

/**
 * Determine whether a candidate fits a bounded entity world line.
 * @param {Array<unknown>} args Legacy positional feasibility arguments.
 * @returns {{feasible: boolean, reason?: string}} Feasibility result.
 */
export function evaluateWorldLine(...args) {
  const [pointsInput, existingSegments, candidateSegment, ...bounds] = args;
  return evaluateWorldLineMany(
    pointsInput,
    existingSegments,
    [candidateSegment],
    ...bounds
  );
}

/**
 * Determine whether multiple candidate segments fit one bounded world line.
 * @param {Array<unknown>} args Legacy positional feasibility arguments.
 * @returns {{feasible: boolean, reason?: string}} Feasibility result.
 */
export function evaluateWorldLineMany(...args) {
  const [
    pointsInput,
    existingSegments,
    candidateSegments,
    entryPoint,
    exitPoint,
    spacePointsInput = [],
  ] = args;
  /** @type {Record<string, unknown>[]} */
  const pointsRecords = Array.isArray(pointsInput) ? pointsInput : [];
  /** @type {Record<string, unknown>[]} */
  const existingRecords = Array.isArray(existingSegments)
    ? existingSegments
    : [];
  /** @type {Record<string, unknown>[]} */
  const candidateRecords = Array.isArray(candidateSegments)
    ? candidateSegments
    : [];
  /** @type {Record<string, unknown>} */
  const entryRecord = /** @type {Record<string, unknown>} */ (entryPoint || {});
  /** @type {Record<string, unknown>} */
  const exitRecord = /** @type {Record<string, unknown>} */ (exitPoint || {});
  /** @type {Record<string, unknown>[] | undefined} */
  const spacePointRecords = Array.isArray(spacePointsInput)
    ? spacePointsInput
    : undefined;
  try {
    const points = new Map(
      resolvePointRecords(pointsRecords, spacePointRecords).map(point => [
        String(point.pointId),
        point,
      ])
    );
    if (!entryRecord.pointId)
      return { feasible: false, reason: 'missing-entry-point' };
    points.set(String(entryRecord.pointId), entryRecord);
    if (exitRecord.pointId) points.set(String(exitRecord.pointId), exitRecord);
    if (candidateRecords.length === 0)
      return { feasible: false, reason: 'missing-candidate-segments' };
    if (candidateRecords.some(segment => !segment?.segmentId))
      return { feasible: false, reason: 'invalid-candidate-segment' };
    const candidateIds = candidateRecords.map(segment =>
      String(segment.segmentId)
    );
    if (new Set(candidateIds).size !== candidateIds.length)
      return { feasible: false, reason: 'duplicate-candidate-segment' };
    const existingIds = new Set(
      existingRecords.map(segment => String(segment?.segmentId))
    );
    if (candidateIds.some(id => existingIds.has(id)))
      return { feasible: false, reason: 'duplicate-segment' };
    const segments = new Map(
      [...existingRecords, ...candidateRecords].map(segment => [
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
    const entryTime = Date.parse(String(entryRecord.timestamp));
    if (!Number.isFinite(entryTime))
      return { feasible: false, reason: 'invalid-entry-point' };
    if (resolved[0].startTime < entryTime)
      return { feasible: false, reason: 'before-entry' };
    if (!bridge(entryRecord, resolved[0], entryTime))
      return { feasible: false, reason: 'entry-discontinuity' };
    for (let index = 1; index < resolved.length; index++) {
      const previous = resolved[index - 1],
        next = resolved[index];
      if (previous.endTime > next.startTime)
        return { feasible: false, reason: 'temporal-overlap' };
      if (!bridge(previous.end, next, previous.endTime))
        return { feasible: false, reason: 'world-line-discontinuity' };
    }
    if (exitRecord.pointId) {
      const exitTime = Date.parse(String(exitRecord.timestamp));
      if (!Number.isFinite(exitTime))
        return { feasible: false, reason: 'invalid-exit-point' };
      const last = resolved[resolved.length - 1];
      if (last.endTime > exitTime)
        return { feasible: false, reason: 'after-exit' };
      if (!bridge(last.end, exitRecord, last.endTime))
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
 * @returns {boolean} Whether the next point is connected in time and space.
 * @param {Record<string, any>} previousPoint Previous point.
 * @param {Record<string, any>} nextSegmentOrPoint Next segment or point.
 * @param {number} previousTime Previous timestamp.
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
 * @returns {boolean} Whether both points share coordinates.
 * @param {Record<string, any>} first First point.
 * @param {Record<string, any>} second Second point.
 */
function sameLocation(first, second) {
  return (
    Number(first.latitude) === Number(second.latitude) &&
    Number(first.longitude) === Number(second.longitude)
  );
}

/**
 * @param {{startTime: number, endTime: number}} interval Candidate interval.
 * @param {{startTime: number, endTime: number}} shift Shift interval.
 * @returns {boolean} Whether shift contains interval.
 */
export function containedBy(interval, shift) {
  return (
    interval.startTime >= shift.startTime && interval.endTime <= shift.endTime
  );
}
/**
 * Parse a legacy feasibility request with its message-only rejection contract.
 * @param {string} input JSON input with the original empty-object fallback.
 * @param {(request: Record<string, any>) => string} calculate Feasibility strategy.
 * @returns {string} Serialized feasibility outcome.
 */
export function legacyFeasibilityBoundary(input, calculate) {
  return runFeasibilityCalculation(() => calculate(JSON.parse(input || '{}')));
}

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

/**
 * @param {string} input JSON with points, existingSegments, candidateSegment, entryPoint, and optional exitPoint.
 * @returns {string} Structured feasibility result.
 */
export function segmentAssignmentFeasibility(input) {
  return legacyFeasibilityBoundary(input, calculateWorldLine);
}

/**
 * Evaluate the world line with legacy optional-collection defaults.
 * @param {Record<string, any>} x Parsed request.
 * @returns {string} Serialized world-line outcome.
 */
function calculateWorldLine(x) {
  return JSON.stringify(
    evaluateWorldLine(
      x.points || [],
      x.existingSegments || [],
      x.candidateSegment,
      x.entryPoint,
      x.exitPoint,
      x.spacePoints || []
    )
  );
}

/**
 * @param {string} input JSON with points, candidateSegment, maximumSpeed, and speedUnit.
 * @returns {string} Structured feasibility result.
 */
export function segmentMaximumSpeedFeasibility(input) {
  return legacyFeasibilityBoundary(input, calculateMaximumSpeed);
}

/**
 * Resolve the candidate motion and compare it to the caller's speed limit.
 * @param {Record<string, any>} x Parsed speed request.
 * @returns {string} Detailed speed and feasibility response.
 */
function calculateMaximumSpeed(x) {
  const points = indexPointRecords(
    resolvePointRecords(x.points || [], x.spacePoints || [])
  );
  const candidate = resolveCandidateSegment(x.candidateSegment, points);
  const { distanceMeters, durationSeconds, requiredSpeed } =
    measureSegmentMotion(candidate);
  const maximumSpeed = Number(x.maximumSpeed);
  if (!Number.isFinite(maximumSpeed) || maximumSpeed < 0)
    throw new Error('maximumSpeed must be a non-negative number.');
  return JSON.stringify({
    feasible: requiredSpeed <= maximumSpeed,
    distanceMeters,
    durationSeconds,
    requiredSpeedKilometersPerHour: requiredSpeed,
    maximumSpeedKilometersPerHour: maximumSpeed,
  });
}
