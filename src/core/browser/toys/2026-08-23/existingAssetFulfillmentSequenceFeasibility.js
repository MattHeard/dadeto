import { evaluateWorldLineMany } from '../2026-08-21/segmentAssignmentFeasibilityCore.js';
import {
  fulfillmentBoundary,
  fulfillmentNonblank,
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
    const points = mergeById(
      [
        ...(request.points || []),
        ...(proposal.points || []),
        asset.stockInPoint,
      ],
      'pointId'
    );
    const spacePoints = mergeById(
      [...(request.spacePoints || []), ...(proposal.spacePoints || [])],
      'spacePointId'
    );
    const entry = resolvePoint(asset.stockInPoint, spacePoints);
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

/**
 * @param {Record<string, any>} point Point.
 * @param {Array<Record<string, any>>} spacePoints Space points.
 * @returns {Record<string, any>} Coordinate-bearing point.
 */
function resolvePoint(point, spacePoints) {
  const spacePoint = spacePoints.find(
    candidate => candidate.spacePointId === point.spacePointId
  );
  if (!spacePoint)
    throw new Error(`Unknown space point: ${point.spacePointId}`);
  return {
    ...point,
    latitude: spacePoint.latitude,
    longitude: spacePoint.longitude,
  };
}

/**
 * @param {Array<Record<string, any>>} records Records.
 * @param {string} field Identifier field.
 * @returns {Array<Record<string, any>>} Deduplicated records.
 */
function mergeById(records, field) {
  const byId = new Map();
  records.forEach(record => {
    if (!record || !fulfillmentNonblank(record[field]))
      throw new Error(`Invalid ${field}.`);
    const id = String(record[field]);
    const existing = byId.get(id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(record))
      throw new Error(`Conflicting ${field}: ${id}`);
    byId.set(id, { ...record, [field]: id });
  });
  return [...byId.values()];
}
