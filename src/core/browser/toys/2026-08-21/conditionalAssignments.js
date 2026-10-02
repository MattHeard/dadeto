import { legacyAssignmentBoundary } from './safeAssignmentPersistence.js';
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
 * Reject infeasible requests before constructing and appending their record.
 * @param {Record<string, any>} request Assignment request.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage lens.
 * @param {{feasible: boolean, reason?: unknown}} feasibility Validated world line.
 * @param {{field: string, path: string, metadata: () => Record<string, unknown>}} options Assignment identity and deferred metadata.
 * @returns {string} Original append or rejection envelope.
 */
function commitConditional(
  request,
  env,
  feasibility,
  { field, path, metadata }
) {
  if (!feasibility.feasible) return formatAssignmentFailure(feasibility.reason);
  return appendValidatedAssignment(
    {
      request,
      assignment: {
        [field]: String(request[field] || ''),
        segmentId: String(request.candidateSegment.segmentId),
      },
      path,
      metadata: metadata(),
      feasibility,
    },
    env
  );
}

/**
 * Adapt legacy request collections to the world-line evaluator.
 * @param {Record<string, any>} request Parsed assignment request.
 * @param {any} entry Starting bound.
 * @param {any} exit Ending bound.
 * @param {any} points Strategy-selected point collection.
 * @returns {ReturnType<typeof evaluateWorldLine>} World-line feasibility.
 */
function evaluateAssignment(request, entry, exit, points) {
  return evaluateWorldLine(
    points,
    request.existingSegments || [],
    request.candidateSegment,
    entry,
    exit,
    request.spacePoints || []
  );
}

/**
 * Calculate and append a single asset assignment.
 * @param {Record<string, any>} x Parsed asset request.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Serialized asset assignment result.
 */
function writeAsset(x, env) {
  const result = evaluateAssignment(
    x,
    x.stockInPoint,
    x.stockOutPoint,
    x.points || []
  );
  return commitConditional(x, env, result, {
    field: 'assetId',
    path: 'assetSegmentAssignments',
    metadata: () => ({
      object: { assetId: x.assetId, segmentId: x.candidateSegment.segmentId },
    }),
  });
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
  const result = evaluateAssignment(
    x,
    matching.clockInPoint,
    matching.clockOutPoint,
    x.points
  );
  return commitConditional(x, env, result, {
    field: 'personId',
    path: 'personSegmentAssignments',
    metadata: () => ({ shiftId: matching.shiftId }),
  });
}
