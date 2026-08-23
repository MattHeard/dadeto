// Toy: Procurement Normal Fulfillment Composer
import { fulfillmentFailure } from './fulfillmentResult.js';

/**
 * Prepend a valid procurement prefix to a valid normal proposal.
 * @param {string} input JSON containing procurement and normal proposals.
 * @returns {string} Deterministic composed proposal or structured failure.
 */
export function procurementNormalFulfillmentComposer(input) {
  try {
    const request = JSON.parse(input);
    const procurement = validProposal(
      request.procurementProposal,
      'procurement'
    );
    const normal = validProposal(request.normalProposal, 'normal');
    const procurementSegment = procurement.segments[0];
    const normalDelivery = normal.segments.find(
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
  } catch (error) {
    return fulfillmentFailure(error);
  }
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
  return proposal.points.find(point => point.pointId === pointId);
}

/**
 * @param {Array<any>} left Left records.
 * @param {Array<any>} right Right records.
 * @param {string} idKey ID field.
 * @returns {Array<any>} Merged records.
 */
function mergeById(left, right, idKey) {
  const records = new Map();
  [...left, ...right].forEach(record => {
    const id = record[idKey];
    const previous = records.get(id);
    if (previous && stableRecord(previous) !== stableRecord(record))
      throw new Error(`Conflicting record: ${id}`);
    records.set(id, record);
  });
  return [...records.values()];
}

/**
 * @param {Array<any>} left Left space points.
 * @param {Array<any>} right Right space points.
 * @returns {Array<any>} Merged space points.
 */
function mergeSpacePoints(left, right) {
  const records = new Map();
  [...left, ...right].forEach(record => {
    const previous = records.get(record.spacePointId);
    if (
      previous &&
      (String(previous.latitude) !== String(record.latitude) ||
        String(previous.longitude) !== String(record.longitude))
    )
      throw new Error(`Conflicting record: ${record.spacePointId}`);
    records.set(record.spacePointId, record);
  });
  return [...records.values()];
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
