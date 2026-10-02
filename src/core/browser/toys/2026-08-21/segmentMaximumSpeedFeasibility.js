// Toy: Segment Maximum-Speed Feasibility
import {
  indexPointRecords,
  resolveCandidateSegment,
  measureSegmentMotion,
  legacyFeasibilityBoundary,
} from './segmentAssignmentFeasibilityCore.js';
import { resolvePointRecords } from '../2026-08-22/spacePointResolution.js';

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
