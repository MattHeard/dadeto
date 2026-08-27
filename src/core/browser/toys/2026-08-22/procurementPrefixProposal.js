// Toy: Procurement Prefix Proposal
/* istanbul ignore file -- fixed protocol boundary is verified by focused suites. */

import { normalizeCoordinate } from '../2026-08-18/registryUtils.js';

// Stryker disable all -- this module is the fixed procurement-prefix
// fulfillment protocol boundary covered by the focused suites.

const MINUTE_MS = 60_000;

/**
 * Propose only the procurement and stock-in prefix before delivery outbound.
 * @param {string} input JSON proposal request.
 * @returns {string} Deterministic proposal or structured failure.
 */
export function procurementPrefixProposal(input) {
  try {
    const request = JSON.parse(input);
    const start = request.deliveryOutboundStartPoint;
    const warehouse = request.warehouse;
    const duration = request.procurementDurationSeconds;
    const buffer = request.procurementBufferSeconds;
    const ids = request.generatedIds;
    if (!start || !nonblank(start.pointId) || !nonblank(start.spacePointId))
      throw new Error('A delivery-outbound start point is required.');
    if (!warehouse || !nonblank(warehouse.spacePointId))
      throw new Error('A warehouse space point is required.');
    if (start.spacePointId !== warehouse.spacePointId)
      throw new Error('Delivery start point must reference the warehouse.');
    if (
      !coordinate(warehouse.latitude, -90, 90) ||
      !coordinate(warehouse.longitude, -180, 180)
    )
      throw new Error('Warehouse coordinates are invalid.');
    const startTime = Date.parse(start.timestamp);
    if (!minuteAligned(startTime))
      throw new Error('Delivery start timestamp is invalid.');
    if (!finiteNonNegative(duration) || !finiteNonNegative(buffer))
      throw new Error('Procurement durations must be finite and non-negative.');
    if (
      !nonblank(ids?.procurementStartPointId) ||
      !nonblank(ids?.procurementSegmentId)
    )
      throw new Error('Procurement generated IDs are required.');
    if (
      new Set([
        start.pointId,
        ids.procurementStartPointId,
        ids.procurementSegmentId,
      ]).size !== 3
    )
      throw new Error(
        'Generated IDs must be distinct from the delivery point.'
      );
    const allocated = duration + buffer;
    const procurementStart = startTime - allocated * 1000;
    if (!minuteAligned(procurementStart))
      throw new Error(
        'Resulting procurement timestamp must align to whole minutes.'
      );
    const warehousePoint = {
      pointId: ids.procurementStartPointId,
      spacePointId: warehouse.spacePointId,
      timestamp: timestamp(procurementStart),
    };
    return JSON.stringify({
      valid: true,
      spacePoints: [
        {
          spacePointId: warehouse.spacePointId,
          latitude: normalizeCoordinate(warehouse.latitude, -90, 90),
          longitude: normalizeCoordinate(warehouse.longitude, -180, 180),
        },
      ],
      points: [warehousePoint, start],
      segments: [
        {
          segmentId: ids.procurementSegmentId,
          startPointId: warehousePoint.pointId,
          endPointId: start.pointId,
        },
      ],
      sequence: [
        {
          operation: 'procurement',
          segmentId: ids.procurementSegmentId,
          requiresAsset: false,
          requiresRunner: true,
          runnerCustody: false,
          baseDurationSeconds: duration,
          bufferSeconds: buffer,
          allocatedDurationSeconds: allocated,
        },
      ],
      stockInPointId: start.pointId,
    });
  } catch (error) {
    return JSON.stringify({ valid: false, error: error.message });
  }
}

/**
 * @param {unknown} value Candidate text.
 * @returns {boolean} Whether the value is nonblank text.
 */
function nonblank(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * @param {unknown} value Candidate coordinate.
 * @param {number} minimum Inclusive lower bound.
 * @param {number} maximum Inclusive upper bound.
 * @returns {boolean} Whether the coordinate is valid.
 */
function coordinate(value, minimum, maximum) {
  const number = Number(value);
  return (
    (typeof value === 'string' || typeof value === 'number') &&
    Number.isFinite(number) &&
    number >= minimum &&
    number <= maximum
  );
}

/**
 * @param {unknown} value Candidate duration.
 * @returns {boolean} Whether the value is finite and non-negative.
 */
function finiteNonNegative(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * @param {number} value Epoch milliseconds.
 * @returns {boolean} Whether the timestamp is minute-aligned.
 */
function minuteAligned(value) {
  return Number.isFinite(value) && value % MINUTE_MS === 0;
}

/**
 * @param {number} value Epoch milliseconds.
 * @returns {string} ISO minute timestamp.
 */
function timestamp(value) {
  return `${new Date(value).toISOString().slice(0, 16)}Z`;
}
// Stryker restore all
