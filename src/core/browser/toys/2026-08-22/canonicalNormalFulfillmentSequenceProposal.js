// Toy: Canonical Normal Fulfillment Sequence Proposal

import { normalizeCoordinateRecord } from '../2026-08-18/registryUtils.js';
import { resolvePointRecords } from './spacePointResolution.js';
import { normalFulfillmentSequenceProposal } from './normalFulfillmentSequenceProposal.js';
import { fulfillmentFailure } from './fulfillmentResult.js';

/**
 * Build a normal fulfillment proposal with a self-contained canonical spatial context.
 * @param {string} input JSON proposal request.
 * @returns {string} Deterministic proposal or structured failure.
 */
export function canonicalNormalFulfillmentSequenceProposal(input) {
  try {
    const request = JSON.parse(input);
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
  } catch (error) {
    return fulfillmentFailure(error);
  }
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
 * @returns {{spacePointId: string, latitude: number, longitude: number}} Canonical point.
 */
function canonicalSpacePoint(value) {
  const record = normalizeCoordinateRecord(value, 'spacePointId');
  if (!record || record.latitude === null || record.longitude === null)
    throw new Error('Invalid canonical space point.');
  return {
    spacePointId: record.id,
    latitude: record.latitude,
    longitude: record.longitude,
  };
}
