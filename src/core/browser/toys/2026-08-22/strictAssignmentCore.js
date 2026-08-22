// Shared strict validation and feasibility for superseding assignment writers.

import {
  evaluateWorldLine,
  resolveSegment,
} from '../2026-08-21/segmentAssignmentFeasibilityCore.js';
import { wgs84Distance } from '../2026-08-20/wgs84Distance.js';

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
 * Resolve the candidate and calculate required speed.
 * @param {Record<string, unknown>} input Assignment input.
 * @returns {{candidate: ReturnType<typeof resolveSegment>, requiredSpeed: number, maximumSpeed: number}} Speed result.
 */
export function resolveSpeed(input) {
  /** @type {Array<Record<string, unknown>>} */
  const pointValues = /** @type {Array<Record<string, unknown>>} */ (
    input.points || []
  );
  const points = new Map(
    pointValues.map(point => [String(point.pointId), point])
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
  const requiredSpeed =
    duration === 0
      ? distance === 0
        ? 0
        : Infinity
      : distance / 1000 / (duration / 3600);
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
  /** @type {Array<Record<string, unknown>>} */
  const pointValues = /** @type {Array<Record<string, unknown>>} */ (
    input.points || []
  );
  /** @type {Array<Record<string, unknown>>} */
  const segmentValues = /** @type {Array<Record<string, unknown>>} */ (
    input.existingSegments || []
  );
  const candidateSegment = /** @type {Record<string, unknown>} */ (
    input.candidateSegment
  );
  return evaluateWorldLine(
    pointValues,
    segmentValues,
    candidateSegment,
    shift.clockInPoint,
    shift.clockOutPoint
  );
}

/**
 * Build a point lookup map.
 * @param {Record<string, unknown>} input Assignment input.
 * @returns {Map<string, Record<string, unknown>>} Point map.
 */
export function buildPoints(input) {
  /** @type {Array<Record<string, unknown>>} */
  const pointValues = /** @type {Array<Record<string, unknown>>} */ (
    input.points || []
  );
  return new Map(pointValues.map(point => [String(point.pointId), point]));
}
