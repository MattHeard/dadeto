// Toy: Segment Maximum-Speed Feasibility
import {
  indexPointRecords,
  resolveCandidateSegment,
  measureSegmentMotion,
} from './segmentAssignmentFeasibilityCore.js';
import { resolvePointRecords } from '../2026-08-22/spacePointResolution.js';

/**
 * @param {string} input JSON with points, candidateSegment, maximumSpeed, and speedUnit.
 * @returns {string} Structured feasibility result.
 */
export function segmentMaximumSpeedFeasibility(input) {
  try {
    const x = JSON.parse(input || '{}'),
      points = indexPointRecords(
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
  } catch (error) {
    return JSON.stringify({
      feasible: false,
      reason: error.message,
    });
  }
}
