// Toy: Segment Maximum-Speed Feasibility
// jscpd:ignore-start
/* eslint-disable jsdoc/require-returns */
import { wgs84Distance } from '../2026-08-20/wgs84Distance.js';
import { resolveSegment } from './segmentAssignmentFeasibilityCore.js';

/** @param {string} input JSON with points, candidateSegment, maximumSpeed, and speedUnit. @returns {string} Structured feasibility result. */
export function segmentMaximumSpeedFeasibility(input) {
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
          : Infinity
        : distanceMeters / 1000 / (durationSeconds / 3600);
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
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}
// jscpd:ignore-end
