// Shared strict validation and feasibility for superseding assignment writers.

import {
  evaluateWorldLine,
  resolveSegment,
  requiredSegmentSpeed,
} from '../2026-08-21/segmentAssignmentFeasibilityCore.js';
import { wgs84Distance } from '../2026-08-20/wgs84Distance.js';
import { resolvePointRecords } from './spacePointResolution.js';
import { appendOneAssignment } from '../2026-08-21/safeAssignmentPersistence.js';

/**
 * Parse a strict assignment request and preserve its shared rejection envelope.
 * @param {string} input JSON request.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @param {(request: Record<string, any>) => string | {request: {memoryLocation?: string, path?: string}, assignment: Record<string, unknown>, path: string, metadata: Record<string, unknown>, feasibility: {feasible: boolean, reason?: unknown}}} calculate Assignment evaluator.
 * @returns {string} Serialized assignment result.
 */
export function strictAssignmentBoundary(input, env, calculate) {
  try {
    const result = calculate(JSON.parse(input || '{}'));
    if (typeof result === 'string') {
      return result;
    }
    return appendValidatedAssignment(result, env);
  } catch (error) {
    return formatAssignmentFailure(assignmentErrorReason(error));
  }
}

/**
 * Persist a feasible assignment and serialize its common successful result.
 * @param {{request: {memoryLocation?: string, path?: string}, assignment: Record<string, unknown>, path: string, metadata: Record<string, unknown>, feasibility: {feasible: boolean, reason?: unknown}}} options Assignment persistence and toy-specific response metadata.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Strict append result.
 */
export function appendValidatedAssignment(
  { request, assignment, path, metadata, feasibility },
  env
) {
  if (!feasibility.feasible) {
    return formatAssignmentFailure(feasibility.reason);
  }
  const length = appendOneAssignment(request, assignment, path, env);
  return JSON.stringify({
    appended: true,
    feasible: true,
    length,
    ...metadata,
  });
}

/**
 * Normalize an identifier and reject absent/sentinel values.
 * @param {unknown} value Candidate identifier.
 * @returns {string|null} Valid identifier or null.
 */
export function normalizeAssignmentId(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized && !['undefined', 'null'].includes(normalized.toLowerCase())
    ? normalized
    : null;
}

/**
 * Report a rejected single assignment with the common public contract.
 * @param {unknown} reason Rejection reason.
 * @returns {string} Serialized rejection.
 */
export function formatAssignmentFailure(reason) {
  return JSON.stringify({ appended: false, feasible: false, reason });
}

/**
 * Find the first shift that fully covers the candidate interval.
 * @param {Array<Record<string, any>>} shifts Available shifts.
 * @param {{startTime: number, endTime: number}} candidate Resolved interval.
 * @returns {Record<string, any> | undefined} Covering shift, if present.
 */
export function findCoveringShift(shifts, candidate) {
  return shifts.find(
    shift =>
      candidate.startTime >= Date.parse(shift.clockInPoint?.timestamp) &&
      candidate.endTime <= Date.parse(shift.clockOutPoint?.timestamp)
  );
}

/**
 * Normalize thrown values without losing their message.
 * @param {unknown} error Thrown value.
 * @returns {string} Public failure reason.
 */
export function assignmentErrorReason(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Validate canonical maximum speed in kilometres per hour.
 * @param {unknown} value Candidate speed.
 * @returns {number|null} Finite non-negative speed or null.
 */
export function normalizeMaximumSpeed(value) {
  if (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && !value.trim())
  )
    return null;
  const speed = Number(value);
  return Number.isFinite(speed) && speed >= 0 ? speed : null;
}

/**
 * Read a list-valued assignment field with a stable object shape.
 * @param {Record<string, unknown>} input Assignment input.
 * @param {string} key Field name.
 * @returns {Array<Record<string, unknown>>} Object entries.
 */
function readAssignmentRecords(input, key) {
  return /** @type {Array<Record<string, unknown>>} */ (input[key] || []);
}

/**
 * Resolve the candidate and calculate required speed.
 * @param {Record<string, unknown>} input Assignment input.
 * @returns {{candidate: ReturnType<typeof resolveSegment>, requiredSpeed: number, maximumSpeed: number}} Speed result.
 */
export function resolveSpeed(input) {
  const pointValues = readAssignmentRecords(input, 'points');
  const points = new Map(
    resolvePointRecords(
      pointValues,
      readAssignmentRecords(input, 'spacePoints')
    ).map(point => [String(point.pointId), point])
  );
  const candidateSegment = /** @type {Record<string, unknown>} */ (
    input.candidateSegment
  );
  const segments = /** @type {Map<string, Record<string, unknown>>} */ (
    new Map([[String(candidateSegment.segmentId), candidateSegment]])
  );
  const candidate = resolveSegment(
    segments,
    points,
    String(candidateSegment.segmentId)
  );
  const distance = wgs84Distance(
    Number(candidate.start.latitude),
    Number(candidate.start.longitude),
    Number(candidate.end.latitude),
    Number(candidate.end.longitude)
  );
  const duration = (candidate.endTime - candidate.startTime) / 1000;
  const requiredSpeed = requiredSegmentSpeed(distance, duration);
  const maximumSpeed = normalizeMaximumSpeed(input.maximumSpeed);
  if (maximumSpeed === null) throw new Error('invalid-maximum-speed');
  return { candidate, requiredSpeed, maximumSpeed };
}

/**
 * Evaluate the bounded runner world line.
 * @param {Record<string, unknown>} input Assignment input.
 * @param {Record<string, any>} shift Matching shift.
 * @returns {{feasible: boolean, reason?: string}} Runner feasibility.
 */
export function evaluateRunnerWorldLine(input, shift) {
  const pointValues = readAssignmentRecords(input, 'points');
  const segmentValues = readAssignmentRecords(input, 'existingSegments');
  const candidateSegment = /** @type {Record<string, unknown>} */ (
    input.candidateSegment
  );
  return evaluateWorldLine(
    pointValues,
    segmentValues,
    candidateSegment,
    shift.clockInPoint,
    shift.clockOutPoint,
    readAssignmentRecords(input, 'spacePoints')
  );
}

/**
 * Build a point lookup map.
 * @param {Record<string, unknown>} input Assignment input.
 * @returns {Map<string, Record<string, unknown>>} Point map.
 */
export function buildPoints(input) {
  return new Map(
    readAssignmentRecords(input, 'points').map(point => [
      String(point.pointId),
      point,
    ])
  );
}
