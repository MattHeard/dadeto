import {
  legacyAssignmentBoundary,
  commitAssetCustodianAssignment,
  createAssetCustodianCommitPlan,
  formatCommitFailure,
} from './safeAssignmentPersistence.js';
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
 * @param {(reason: unknown) => string} [reject] Caller-specific failure serializer.
 * @returns {(input: string, env: import('../browserToysCore.js').ToyEnv) => string} JSON assignment toy.
 */
function createConditionalAssignment(write, reject = formatAssignmentFailure) {
  return (input, env) => legacyAssignmentBoundary(input, env, write, reject);
}

/** Asset assignment using stock-bound world-line validation. */
export const assignAssetToSegmentIfFeasible =
  createConditionalAssignment(writeAsset);
/** Runner assignment validating its shift and maximum speed before persistence. */
export const assignRunnerToSegmentIfFeasible =
  createConditionalAssignment(writeRunner);
/** Compound assignment retaining committed failures and atomic persistence. */
export const assignAssetAndCustodianToSegmentIfFeasible =
  createConditionalAssignment(writeAssetCustodian, formatCommitFailure);

/**
 * Create a writer that commits one legacy assignment strategy after feasibility.
 * @param {string} field Assignment owner field.
 * @param {string} path Destination collection path.
 * @param {(request: Record<string, any>) => Record<string, unknown>} buildMetadata Strategy metadata builder.
 * @returns {(request: Record<string, any>, env: import('../browserToysCore.js').ToyEnv, feasibility: {feasible: boolean, reason?: unknown}) => string} Conditional assignment writer.
 */
function createConditionalCommitter(field, path, buildMetadata) {
  return (request, env, feasibility) => {
    if (!feasibility.feasible)
      return formatAssignmentFailure(feasibility.reason);
    return appendValidatedAssignment(
      {
        request,
        assignment: {
          [field]: String(request[field] || ''),
          segmentId: String(request.candidateSegment.segmentId),
        },
        path,
        metadata: buildMetadata(request),
        feasibility,
      },
      env
    );
  };
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
  return commitAssetAssignment(x, env, result);
}

/**
 * Materialize raw asset identity only after feasibility has been accepted.
 * @param {Record<string, any>} request Asset assignment request.
 * @returns {{object: {assetId: unknown, segmentId: unknown}}} Uncoerced identity metadata.
 */
function buildAssetMetadata(request) {
  const assetId = request.assetId;
  const segmentId = request.candidateSegment.segmentId;
  return { object: { assetId, segmentId } };
}
const commitAssetAssignment = createConditionalCommitter(
  'assetId',
  'assetSegmentAssignments',
  buildAssetMetadata
);

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
  return createConditionalCommitter(
    'personId',
    'personSegmentAssignments',
    () => ({ shiftId: matching.shiftId })
  )(x, env, result);
}

/**
 * Validate both world lines before atomically persisting a legacy compound assignment.
 * @param {Record<string, any>} x Parsed combined assignment request.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Original atomic commit or committed-failure envelope.
 */
function writeAssetCustodian(x, env) {
  const { candidate, matching } = resolveLegacyRunnerShift(x);
  if (!matching) return formatCommitFailure('outside-shift');
  const assetResult = evaluateWorldLine(
    x.points,
    x.existingAssetSegments || [],
    x.candidateSegment,
    x.stockInPoint,
    x.stockOutPoint,
    x.spacePoints || []
  );
  if (!assetResult.feasible)
    return formatCommitFailure(`asset:${assetResult.reason}`);
  const runnerResult = evaluateWorldLine(
    x.points,
    x.existingPersonSegments || [],
    x.candidateSegment,
    matching.clockInPoint,
    matching.clockOutPoint,
    x.spacePoints || []
  );
  if (!runnerResult.feasible)
    return formatCommitFailure(`runner:${runnerResult.reason}`);
  const maximum = Number(x.maximumSpeedKilometersPerHour);
  const { requiredSpeed: required } = measureSegmentMotion(candidate, 0);
  if (!Number.isFinite(maximum) || required > maximum)
    return formatCommitFailure('excessive-speed');
  return commitAssetCustodianAssignment(
    createAssetCustodianCommitPlan(x, legacyCompoundIdentity(x)),
    env
  );
}

/**
 * Preserve legacy compound identifier coercion before the atomic commit.
 * @param {Record<string, any>} request Combined assignment request.
 * @returns {{assetId: string, personId: string, segmentId: string}} Commit identities.
 */
function legacyCompoundIdentity(request) {
  return {
    assetId: String(request.assetId),
    personId: String(request.custodianPersonId),
    segmentId: String(request.candidateSegment.segmentId),
  };
}
