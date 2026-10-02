import {
  commitAssetCustodianAssignment,
  formatCommitFailure,
} from '../2026-08-21/safeAssignmentPersistence.js';
import {
  normalizeAssignmentId,
  resolveSpeed,
  evaluateRunnerWorldLine,
  strictAssignmentBoundary,
  findAssignmentShift,
  evaluateStockWorldLine,
  formatAssignmentFailure,
} from './strictAssignmentCore.js';

/**
 * Construct a strict assignment toy with its caller-specific rejection policy.
 * @param {(request: Record<string, any>, env: import('../browserToysCore.js').ToyEnv) => ReturnType<Parameters<typeof strictAssignmentBoundary>[2]>} calculate Assignment strategy.
 * @param {Parameters<typeof strictAssignmentBoundary>[3]} [reject] Rejection serializer.
 * @returns {(input: string, env: import('../browserToysCore.js').ToyEnv) => string} Public assignment adapter.
 */
function createValidatedAssignment(calculate, reject) {
  return (input, env) =>
    strictAssignmentBoundary(
      input,
      env,
      request => calculate(request, env),
      reject
    );
}

/** Strict single-asset assignment strategy. */
export const validatedAssetSegmentAssignment =
  createValidatedAssignment(calculateAsset);
/** Strict single-runner assignment strategy. */
export const validatedRunnerSegmentAssignment =
  createValidatedAssignment(calculateRunner);
/** Atomic asset/custodian assignment with its original commit rejection envelope. */
export const validatedAssetCustodianSegmentAssignment =
  createValidatedAssignment(calculateCustodian, formatCommitFailure);

/**
 * Execute the original asset assignment validation strategy.
 * @param {Record<string, any>} x Parsed assignment request.
 * @returns {ReturnType<Parameters<typeof strictAssignmentBoundary>[2]>} Validated assignment or rejection.
 */
function calculateAsset(x) {
  const assetId = normalizeAssignmentId(x.assetId),
    segmentId = normalizeAssignmentId(x.candidateSegment?.segmentId);
  if (!assetId) return formatAssignmentFailure('invalid-asset-id');
  if (!segmentId) return formatAssignmentFailure('invalid-segment-id');
  const result = evaluateStockWorldLine(x, x.points || [], x.existingSegments);
  return {
    feasibility: result,
    request: x,
    assignment: { assetId, segmentId },
    path: 'assetSegmentAssignments',
    metadata: { object: { assetId, segmentId } },
  };
}

/**
 * Execute the original runner assignment validation strategy.
 * @param {Record<string, any>} x Parsed assignment request.
 * @returns {ReturnType<Parameters<typeof strictAssignmentBoundary>[2]>} Validated assignment or rejection.
 */
function calculateRunner(x) {
  const personId = normalizeAssignmentId(x.personId),
    segmentId = normalizeAssignmentId(x.candidateSegment?.segmentId);
  if (!personId) return formatAssignmentFailure('invalid-person-id');
  if (!segmentId) return formatAssignmentFailure('invalid-segment-id');
  const speed = resolveSpeed(x);
  const matching = findAssignmentShift(x, speed.candidate);
  if (!matching) return formatAssignmentFailure('outside-shift');
  if (speed.requiredSpeed > speed.maximumSpeed)
    return formatAssignmentFailure('excessive-speed');
  const result = evaluateRunnerWorldLine(x, matching);
  return {
    feasibility: result,
    request: x,
    assignment: { personId, segmentId },
    path: 'personSegmentAssignments',
    metadata: { shiftId: matching.shiftId },
  };
}

/**
 * Execute the original custodian assignment validation strategy.
 * @param {Record<string, any>} x Parsed assignment request.
 * @param {import('../browserToysCore.js').ToyEnv} env Atomic persistence lens.
 * @returns {ReturnType<Parameters<typeof strictAssignmentBoundary>[2]>} Validated assignment or rejection.
 */
function calculateCustodian(x, env) {
  const assetId = normalizeAssignmentId(x.assetId),
    personId = normalizeAssignmentId(x.custodianPersonId),
    segmentId = normalizeAssignmentId(x.candidateSegment?.segmentId);
  if (!assetId) return formatCommitFailure('invalid-asset-id');
  if (!personId) return formatCommitFailure('invalid-custodian-person-id');
  if (!segmentId) return formatCommitFailure('invalid-segment-id');
  const speed = resolveSpeed(x);
  if (speed.requiredSpeed > speed.maximumSpeed)
    return formatCommitFailure('runner:excessive-speed');
  const asset = evaluateStockWorldLine(x, x.points, x.existingAssetSegments);
  if (!asset.feasible) return formatCommitFailure(`asset:${asset.reason}`);
  const matching = findAssignmentShift(x, speed.candidate);
  if (!matching) return formatCommitFailure('runner:outside-shift');
  const runner = evaluateRunnerWorldLine(
    { ...x, existingSegments: x.existingPersonSegments || [] },
    matching
  );
  if (!runner.feasible) return formatCommitFailure(`runner:${runner.reason}`);
  return commitAssetCustodianAssignment(
    x,
    { assetId, personId, segmentId },
    env
  );
}
