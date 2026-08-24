import { evaluateWorldLineMany } from '../2026-08-21/segmentAssignmentFeasibilityCore.js';
import {
  fulfillmentBoundary,
  fulfillmentMergeById,
  fulfillmentNonblank,
  fulfillmentResolvePoint,
} from '../2026-08-22/fulfillmentResult.js';

const ASSET_OPERATIONS = [
  'delivery-outbound',
  'possession',
  'pickup-return',
  'inspection',
  'cleaning',
];

/**
 * Test whether an asset can follow the complete asset-relevant proposal.
 * @param {string} input JSON request.
 * @returns {string} JSON feasibility result.
 */
export function existingAssetFulfillmentSequenceFeasibility(input) {
  return fulfillmentBoundary(input, 'feasible', request => {
    const asset = request?.asset;
    const proposal = request?.proposal;
    if (!fulfillmentNonblank(asset?.assetId))
      throw new Error('A valid asset is required.');
    if (!fulfillmentNonblank(asset?.stockInPoint?.pointId))
      throw new Error('A stock-in point is required.');
    const candidates = selectAssetSegments(proposal);
    const points = fulfillmentMergeById(
      [
        ...(request.points || []),
        ...(proposal.points || []),
        asset.stockInPoint,
      ],
      'pointId'
    );
    const spacePoints = fulfillmentMergeById(
      [...(request.spacePoints || []), ...(proposal.spacePoints || [])],
      'spacePointId'
    );
    const entry = fulfillmentResolvePoint(asset.stockInPoint, spacePoints);
    return JSON.stringify(
      evaluateWorldLineMany(
        points,
        asset.existingSegments || [],
        candidates,
        entry,
        undefined,
        spacePoints
      )
    );
  });
}

/**
 * @param {Record<string, any>} proposal Proposal.
 * @returns {Array<Record<string, any>>} Asset candidate segments.
 */
function selectAssetSegments(proposal) {
  if (!proposal?.valid || !Array.isArray(proposal.sequence))
    throw new Error('A valid fulfillment proposal sequence is required.');
  if (!Array.isArray(proposal.segments))
    throw new Error('A valid fulfillment proposal segment list is required.');
  const operations = ASSET_OPERATIONS.map(operation => {
    const sequence = /** @type {Array<any>} */ (proposal.sequence);
    const matches = sequence.filter(item => item?.operation === operation);
    if (matches.length !== 1)
      throw new Error(`Operation ${operation} must occur exactly once.`);
    const segments = /** @type {Array<any>} */ (proposal.segments);
    const segment = segments.filter(
      candidate => candidate?.segmentId === matches[0].segmentId
    );
    if (segment.length !== 1)
      throw new Error(`Operation ${operation} references an invalid segment.`);
    return segment[0];
  });
  const ids = operations.map(segment => String(segment.segmentId));
  if (new Set(ids).size !== ids.length)
    throw new Error('Asset operations must reference distinct segments.');
  return operations;
}
