// @ts-nocheck -- this module is consumed through validated HTTP boundaries.
import {
  parseTime,
  exactLookup,
  contained,
  latestPlacement,
  withRunner,
  windowStart,
  windowEnd,
  timestampFromEpoch as iso,
} from './request/index.js';
import { durationMilliseconds } from './timing.js';
export {
  parseTime,
  exactLookup,
  contained,
  validatePossessionContextTime,
  latestPlacement,
  runnerInterval,
} from './request/index.js';

/**
 *
 * @param {Record<string, unknown>} request Delivery timing and runner context.
 * @returns {Record<string, unknown>} Delivery feasibility and placement.
 */
export function delivery(request) {
  const candidate = latestPlacement(
    request.deliveryDurationSeconds,
    request.earliestStartTimestamp ||
      request.nowTimestamp ||
      '1970-01-01T00:00:00Z',
    pointTimestamp(request.deliveryPoint)
  );
  if (!candidate.feasible) return candidate;
  return withRunner(candidate, request);
}

/**
 *
 * @param {Record<string, unknown>} request Procurement timing and supplier context.
 * @returns {Record<string, unknown>} Procurement feasibility and placement.
 */
export function procurement(request) {
  if (
    !Number.isFinite(request.procurementDurationSeconds) ||
    request.procurementDurationSeconds < 0
  )
    return { feasible: false, reason: 'invalid-duration' };
  const deliveryStart = parseTime(request.deliveryOutboundStartTimestamp);
  const supplier = request.supplierAvailability;
  const supplierEnd = parseTime(windowEnd(supplier));
  const candidate = latestPlacement(
    request.procurementDurationSeconds,
    request.nowTimestamp,
    iso(Math.min(deliveryStart, supplierEnd))
  );
  if (!candidate.feasible) return candidate;
  if (
    !contained(
      candidate.startTimestamp,
      candidate.endTimestamp,
      windowStart(supplier),
      windowEnd(supplier)
    )
  )
    return { feasible: false, reason: 'outside-supplier-window' };
  return withRunner(candidate, request);
}

/**
 *
 * @param {Record<string, unknown>} request Pickup timing and runner context.
 * @returns {Record<string, unknown>} Pickup feasibility and placement.
 */
export function pickup(request) {
  if (
    !Number.isFinite(request.pickupDurationSeconds) ||
    request.pickupDurationSeconds < 0
  )
    return { feasible: false, reason: 'invalid-duration' };
  const start = pointTimestamp(request.pickupPoint);
  const startTime = parseTime(start);
  const end = startTime + durationMilliseconds(request.pickupDurationSeconds);
  if (!Number.isFinite(startTime))
    return { feasible: false, reason: 'invalid-pickup-time' };
  const candidate = { startTimestamp: start, endTimestamp: iso(end) };
  return withRunner(candidate, request);
}

/**
 *
 * @param {Record<string, unknown>} request Complete fulfillment context.
 * @returns {Record<string, unknown>} Combined feasibility and placements.
 */
export function composed(request) {
  const deliveryResult = delivery({
    deliveryPoint: request.deliveryPoint,
    deliveryDurationSeconds: request.durations.deliveryOutboundSeconds,
    earliestStartTimestamp: request.nowTimestamp,
    runnerSchedule: request.runnerSchedule,
    runnerCommitments: request.runnerCommitments,
  });
  if (!deliveryResult.feasible)
    return { feasible: false, reason: `delivery:${deliveryResult.reason}` };
  const procurementResult = procurement({
    procurementDurationSeconds: request.durations.procurementSeconds,
    nowTimestamp: request.nowTimestamp,
    deliveryOutboundStartTimestamp: deliveryResult.startTimestamp,
    supplierAvailability: request.supplierAvailability,
    runnerSchedule: request.runnerSchedule,
    runnerCommitments: request.runnerCommitments,
  });
  if (!procurementResult.feasible)
    return {
      feasible: false,
      reason: `procurement:${procurementResult.reason}`,
    };
  const pickupResult = pickup({
    pickupPoint: request.pickupPoint,
    pickupDurationSeconds: request.durations.pickupReturnSeconds,
    runnerSchedule: request.runnerSchedule,
    runnerCommitments: request.runnerCommitments,
  });
  if (!pickupResult.feasible)
    return { feasible: false, reason: `pickup:${pickupResult.reason}` };
  return {
    feasible: true,
    delivery: deliveryResult,
    procurement: procurementResult,
    pickup: pickupResult,
  };
}

/**
 *
 * @param {Record<string, unknown>} request Product and fulfillment context.
 * @returns {{valid: boolean, results: Array<{skuId: string|null}>}} Available SKU results.
 */
export function searchResult(request) {
  const lookup = exactLookup(request);
  if (!lookup.matched) return { valid: true, results: [] };
  const result = composed(request);
  return {
    valid: true,
    results: result.feasible ? [{ skuId: lookup.skuId }] : [],
  };
}

/**
 *
 * @param {{timestamp?: string}|undefined} point Optional spacetime point.
 * @returns {string|undefined} Point timestamp.
 */
export function pointTimestamp(point) {
  return point?.timestamp;
}
