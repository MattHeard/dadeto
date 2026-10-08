// Shared spatial and sequence composition strategies for fulfillment toys.

import { normalizeCoordinateRecord } from '../2026-08-18/registryUtils.js';
import { resolvePointRecords } from './spacePointResolution.js';
import { normalFulfillmentSequenceProposal } from './normalFulfillmentSequenceProposal.js';
import {
  createFulfillmentToy,
  mergeUniqueRecords,
} from './fulfillmentResult.js';

/**
 * Build a normal fulfillment proposal with a self-contained canonical spatial context.
 * @param {string} input JSON proposal request.
 * @returns {string} Deterministic proposal or structured failure.
 */
export const canonicalNormalFulfillmentSequenceProposal = createFulfillmentToy(
  buildCanonicalProposal
);

/**
 * Canonicalize spatial context and build the complete normal proposal.
 * @param {Record<string, any>} request Parsed canonical proposal request.
 * @returns {string} Proposal with self-contained canonical spatial records.
 */
function buildCanonicalProposal(request) {
  const spacePoints = canonicalSpacePoints(request.spacePoints);
  const context = request.possessionContext;
  if (!context?.startPoint || !context?.endPoint)
    throw new Error('A possession context with both points is required.');
  resolvePointRecords(
    [context.startPoint, context.endPoint],
    spacePoints,
    true
  );
  const warehouse = canonicalSpacePoint(request.warehouse);
  const normalInput = {
    ...request,
    warehouse: {
      ...warehouse,
      latitude: Number(warehouse.latitude),
      longitude: Number(warehouse.longitude),
    },
  };
  const proposal = JSON.parse(
    normalFulfillmentSequenceProposal(JSON.stringify(normalInput))
  );
  if (!proposal.valid) throw new Error(proposal.error);
  const allSpacePoints = canonicalSpacePoints([
    ...spacePoints,
    ...proposal.spacePoints,
  ]);
  return JSON.stringify({ ...proposal, spacePoints: allSpacePoints });
}

// Canonicalization owns the spatial normalization boundary.

/**
 * @param {Array<any>} values Candidate space points.
 * @returns {Array<any>} Canonical space points.
 */
function canonicalSpacePoints(values) {
  if (!Array.isArray(values)) throw new Error('spacePoints must be an array.');
  const records = values.map(canonicalSpacePoint);
  const byId = new Map();
  records.forEach(record => {
    const existing = byId.get(record.spacePointId);
    if (
      existing &&
      (existing.latitude !== record.latitude ||
        existing.longitude !== record.longitude)
    )
      throw new Error(`Conflicting space point: ${record.spacePointId}`);
    byId.set(record.spacePointId, record);
  });
  return [...byId.values()].sort((left, right) =>
    left.spacePointId.localeCompare(right.spacePointId)
  );
}

/**
 * @param {any} value Candidate space point.
 * @returns {{spacePointId: string, latitude: string, longitude: string}} Canonical point.
 */
function canonicalSpacePoint(value) {
  const record = normalizeCoordinateRecord(value, 'spacePointId');
  if (!record || record.latitude === null || record.longitude === null)
    throw new Error('Invalid canonical space point.');
  return {
    spacePointId: record.id,
    latitude: String(record.latitude),
    longitude: String(record.longitude),
  };
}

/**
 * Prepend a valid procurement prefix to a valid normal proposal.
 * @param {string} input JSON containing procurement and normal proposals.
 * @returns {string} Deterministic composed proposal or structured failure.
 */
export const procurementNormalFulfillmentComposer = createFulfillmentToy(
  composeValidatedProposals
);

/**
 * Validate continuity and merge procurement and normal proposal records.
 * @param {Record<string, any>} request Parsed composition request.
 * @returns {string} Deterministic composed sequence JSON.
 */
function composeValidatedProposals(request) {
  const procurement = validProposal(request.procurementProposal, 'procurement');
  const normal = validProposal(request.normalProposal, 'normal');
  const procurementSegment = procurement.segments[0];
  const normalSegments = /** @type {Array<any>} */ (normal.segments);
  const normalDelivery = normalSegments.find(
    segment => segment.segmentId === normal.sequence[0].segmentId
  );
  if (
    !normalDelivery ||
    procurementSegment.endPointId !== normalDelivery.startPointId
  )
    throw new Error('Procurement must end at normal delivery start.');
  const procurementPoint = findPoint(
    procurement,
    procurementSegment.endPointId
  );
  const normalPoint = findPoint(normal, normalDelivery.startPointId);
  if (
    !procurementPoint ||
    !normalPoint ||
    procurementPoint.spacePointId !== normalPoint.spacePointId
  )
    throw new Error(
      'Procurement and normal delivery must share the warehouse point.'
    );
  const spacePoints = mergeSpacePoints(
    procurement.spacePoints,
    normal.spacePoints
  );
  const points = mergeById(procurement.points, normal.points, 'pointId');
  const segments = mergeById(
    procurement.segments,
    normal.segments,
    'segmentId'
  );
  const sequence = [...procurement.sequence, ...normal.sequence];
  ensureResolvable(points, spacePoints);
  return JSON.stringify({
    valid: true,
    spacePoints: spacePoints.sort((a, b) =>
      a.spacePointId.localeCompare(b.spacePointId)
    ),
    points,
    segments,
    sequence,
    possessionContext: normal.possessionContext,
    stockInPointId: procurement.stockInPointId,
  });
}

// Composition validates cross-proposal continuity before helper declarations.

/**
 * @param {any} value Candidate proposal.
 * @param {string} name Proposal name.
 * @returns {any} Valid proposal.
 */
function validProposal(value, name) {
  if (
    !value?.valid ||
    !Array.isArray(value.spacePoints) ||
    !Array.isArray(value.points) ||
    !Array.isArray(value.segments) ||
    !Array.isArray(value.sequence)
  )
    throw new Error(`Invalid ${name} proposal.`);
  return value;
}

/**
 * @param {any} proposal Proposal.
 * @param {string} pointId Point ID.
 * @returns {any} Matching point.
 */
function findPoint(proposal, pointId) {
  const points = /** @type {Array<any>} */ (proposal.points);
  return points.find(point => point.pointId === pointId);
}

/**
 * @param {Array<any>} left Left records.
 * @param {Array<any>} right Right records.
 * @param {string} idKey ID field.
 * @returns {Array<any>} Merged records.
 */
function mergeById(left, right, idKey) {
  return mergeRecords(
    left,
    right,
    record => record[idKey],
    (previous, record) => stableRecord(previous) !== stableRecord(record)
  );
}

/**
 * @param {Array<any>} left Left space points.
 * @param {Array<any>} right Right space points.
 * @returns {Array<any>} Merged space points.
 */
function mergeSpacePoints(left, right) {
  return mergeRecords(
    left,
    right,
    record => record.spacePointId,
    (previous, record) =>
      String(previous.latitude) !== String(record.latitude) ||
      String(previous.longitude) !== String(record.longitude)
  );
}

/**
 * Merge records while applying a caller-provided conflict predicate.
 * @param {Array<any>} left Left records.
 * @param {Array<any>} right Right records.
 * @param {(record: any) => string} getId Identifier selector.
 * @param {(previous: any, record: any) => boolean} conflicts Conflict predicate.
 * @returns {Array<any>} Merged records.
 */
function mergeRecords(left, right, getId, conflicts) {
  return mergeUniqueRecords([...left, ...right], { getId, conflicts });
}

/**
 * @param {any} record Record to canonicalize.
 * @returns {string} Stable JSON record.
 */
function stableRecord(record) {
  return JSON.stringify(
    Object.keys(record)
      .sort()
      .reduce((result, key) => ({ ...result, [key]: record[key] }), {})
  );
}

/**
 * @param {Array<any>} points Point records.
 * @param {Array<any>} spacePoints Space-point records.
 * @returns {void} Throws if a point cannot resolve.
 */
function ensureResolvable(points, spacePoints) {
  const ids = new Set(spacePoints.map(point => point.spacePointId));
  if (points.some(point => !ids.has(point.spacePointId)))
    throw new Error('Composed proposal has an unresolved space point.');
}
