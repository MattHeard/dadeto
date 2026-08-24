import { evaluateWorldLine } from '../2026-08-21/segmentAssignmentFeasibilityCore.js';
import { fulfillmentExistingAssetBoundary } from '../2026-08-22/fulfillmentResult.js';

const ASSET_OPERATIONS = new Set([
  'delivery-outbound',
  'possession',
  'pickup-return',
  'inspection',
  'cleaning',
]);

/**
 * Test whether one asset can follow the asset-relevant part of a proposal.
 * @param {string} input JSON request.
 * @returns {string} JSON feasibility result.
 */
export function existingAssetFulfillmentFeasibility(input) {
  return fulfillmentExistingAssetBoundary(
    input,
    proposal => selectAssetSegments(proposal),
    ({ points, existing, candidates, entry, spacePoints }) =>
      evaluateWorldLine(
        points,
        existing,
        candidates[0],
        entry,
        undefined,
        spacePoints
      )
  );
}

// Asset feasibility continues with operation selection after the result boundary.

/**
 * @param {Record<string, any>} proposal Proposal.
 * @returns {Array<Record<string, any>>} Asset segments.
 */
function selectAssetSegments(proposal) {
  if (!proposal?.valid || !Array.isArray(proposal.segments))
    throw new Error('A valid fulfillment proposal is required.');
  if (!Array.isArray(proposal.sequence))
    throw new Error('The fulfillment proposal sequence is required.');
  const selected = proposal.sequence
    .filter(operation => ASSET_OPERATIONS.has(operation?.operation))
    .map(operation => {
      const segments = /** @type {Array<any>} */ (proposal.segments);
      return segments.find(
        segment => segment.segmentId === operation.segmentId
      );
    });
  const operations = proposal.sequence
    .filter(operation => ASSET_OPERATIONS.has(operation?.operation))
    .map(operation => operation.operation);
  if (
    selected.some(segment => !segment) ||
    operations.length !== ASSET_OPERATIONS.size ||
    new Set(operations).size !== ASSET_OPERATIONS.size
  )
    throw new Error(
      'The proposal must contain each asset operation exactly once.'
    );
  return selected;
}

/**
 * @param {unknown} value Candidate value.
 * @returns {boolean} Whether nonblank.
 */
