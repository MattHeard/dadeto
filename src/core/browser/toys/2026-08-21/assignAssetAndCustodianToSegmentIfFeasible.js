// Toy: Assign Asset and Custodian to Segment if Feasible
import {
  evaluateWorldLine,
  resolveSegment,
} from './segmentAssignmentFeasibilityCore.js';
import { appendAtomically } from './safeAssignmentPersistence.js';
import { wgs84Distance } from '../2026-08-20/wgs84Distance.js';

/**
 * @param {string} input JSON combined assignment request. @param {import('../browserToysCore.js').ToyEnv} env Storage helpers. @returns {string} Transaction result.
 * @param env
 */
export function assignAssetAndCustodianToSegmentIfFeasible(input, env) {
  try {
    const x = JSON.parse(input),
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
    const matching = /** @type {Array<Record<string, any>>} */ (
      x.shifts || []
    ).find(
      /** @param {Record<string, any>} shift */
      shift =>
        candidate.startTime >= Date.parse(shift.clockInPoint.timestamp) &&
        candidate.endTime <= Date.parse(shift.clockOutPoint.timestamp)
    );
    if (!matching)
      return JSON.stringify({ committed: false, reason: 'outside-shift' });
    const assetResult = evaluateWorldLine(
      x.points,
      x.existingAssetSegments || [],
      x.candidateSegment,
      x.stockInPoint,
      x.stockOutPoint,
      x.spacePoints || []
    );
    if (!assetResult.feasible)
      return JSON.stringify({
        committed: false,
        reason: `asset:${assetResult.reason}`,
      });
    const runnerResult = evaluateWorldLine(
      x.points,
      x.existingPersonSegments || [],
      x.candidateSegment,
      matching.clockInPoint,
      matching.clockOutPoint,
      x.spacePoints || []
    );
    if (!runnerResult.feasible)
      return JSON.stringify({
        committed: false,
        reason: `runner:${runnerResult.reason}`,
      });
    const maximum = Number(x.maximumSpeedKilometersPerHour),
      duration = (candidate.endTime - candidate.startTime) / 1000,
      distance = wgs84Distance(
        Number(candidate.start.latitude),
        Number(candidate.start.longitude),
        Number(candidate.end.latitude),
        Number(candidate.end.longitude)
      ),
      required = duration === 0 ? 0 : distance / 1000 / (duration / 3600);
    if (!Number.isFinite(maximum) || required > maximum)
      return JSON.stringify({ committed: false, reason: 'excessive-speed' });
    const commit = appendAtomically(
      x.memoryLocation || 'temporary',
      [
        {
          path: x.assetPath || 'assetSegmentAssignments',
          object: {
            assetId: String(x.assetId),
            segmentId: String(x.candidateSegment.segmentId),
          },
        },
        {
          path: x.personPath || 'personSegmentAssignments',
          object: {
            personId: String(x.custodianPersonId),
            segmentId: String(x.candidateSegment.segmentId),
          },
        },
      ],
      env
    );
    return JSON.stringify({ committed: true, lengths: commit.lengths });
  } catch (error) {
    return JSON.stringify({
      committed: false,
      reason: error.message,
    });
  }
}
