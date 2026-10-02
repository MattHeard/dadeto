import { legacyAssignmentBoundary } from './safeAssignmentPersistence.js';
// Toy: Assign Runner to Segment if Feasible
import {
  resolveLegacyRunnerShift,
  evaluateWorldLine,
  measureSegmentMotion,
} from './segmentAssignmentFeasibilityCore.js';
import {
  appendValidatedAssignment,
  formatAssignmentFailure,
} from '../2026-08-22/strictAssignmentCore.js';

/**
 * Bind assignment calculations to the legacy parse and rejection boundary.
 * @param {(request: Record<string, any>, env: import('../browserToysCore.js').ToyEnv) => string} write Assignment strategy.
 * @returns {(input: string, env: import('../browserToysCore.js').ToyEnv) => string} JSON assignment toy.
 */
function createConditionalAssignment(write) {
  return (input, env) =>
    legacyAssignmentBoundary(input, env, write, formatAssignmentFailure);
}

/** Asset assignment using stock-bound world-line validation. */
export const assignAssetToSegmentIfFeasible =
  createConditionalAssignment(writeAsset);
/** Runner assignment validating its shift and maximum speed before persistence. */
export const assignRunnerToSegmentIfFeasible =
  createConditionalAssignment(writeRunner);

/**
 * Calculate and append a single asset assignment.
 * @param {Record<string, any>} x Parsed asset request.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Serialized asset assignment result.
 */
function writeAsset(x, env) {
  const result = evaluateWorldLine(
    x.points || [],
    x.existingSegments || [],
    x.candidateSegment,
    x.stockInPoint,
    x.stockOutPoint,
    x.spacePoints || []
  );
  if (!result.feasible) return formatAssignmentFailure(result.reason);
  return appendValidatedAssignment(
    {
      request: x,
      assignment: {
        assetId: String(x.assetId || ''),
        segmentId: String(x.candidateSegment.segmentId),
      },
      path: 'assetSegmentAssignments',
      metadata: {
        object: {
          assetId: x.assetId,
          segmentId: x.candidateSegment.segmentId,
        },
      },
      feasibility: result,
    },
    env
  );
}
/**
 * Calculate and append a single runner assignment.
 * @param {Record<string, any>} x Parsed runner request.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Serialized runner assignment result.
 */
function writeRunner(x, env) {
  const { candidate, matching } = resolveLegacyRunnerShift(x);
  if (!matching) return formatAssignmentFailure('outside-shift');
  const { requiredSpeed: required } = measureSegmentMotion(candidate);
  if (required > Number(x.maximumSpeedKilometersPerHour))
    return formatAssignmentFailure('excessive-speed');
  const result = evaluateWorldLine(
    x.points,
    x.existingSegments || [],
    x.candidateSegment,
    matching.clockInPoint,
    matching.clockOutPoint,
    x.spacePoints || []
  );
  if (!result.feasible) return formatAssignmentFailure(result.reason);
  return appendValidatedAssignment(
    {
      request: x,
      assignment: {
        personId: String(x.personId || ''),
        segmentId: String(x.candidateSegment.segmentId),
      },
      path: 'personSegmentAssignments',
      metadata: { shiftId: matching.shiftId },
      feasibility: result,
    },
    env
  );
}
