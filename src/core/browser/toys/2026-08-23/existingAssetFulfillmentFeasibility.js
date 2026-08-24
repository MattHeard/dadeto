import { evaluateWorldLine } from '../2026-08-21/segmentAssignmentFeasibilityCore.js';
import {
  fulfillmentBoundary,
  fulfillmentNonblank,
} from '../2026-08-22/fulfillmentResult.js';

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
  return fulfillmentBoundary(input, 'feasible', request => {
    const asset = request?.asset;
    const proposal = request?.proposal;
    if (!fulfillmentNonblank(asset?.assetId))
      throw new Error('A valid asset is required.');
    if (!fulfillmentNonblank(asset?.stockInPoint?.pointId))
      throw new Error('A stock-in point is required.');
    const selected = selectAssetSegments(proposal);
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
    const result = evaluateWorldLine(
      points,
      asset.existingSegments || [],
      selected[0],
      entry,
      undefined,
      spacePoints
    );
    return JSON.stringify(result);
  });
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
 * @param {Record<string, any>} point Point.
 * @param {Array<Record<string, any>>} spacePoints Space points.
 * @returns {Record<string, any>} Resolved point.
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
 * @param {string} field ID field.
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

/**
 * @param {unknown} value Candidate value.
 * @returns {boolean} Whether nonblank.
 */
