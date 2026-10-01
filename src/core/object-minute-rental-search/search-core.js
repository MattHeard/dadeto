// @ts-nocheck -- this module is consumed through validated HTTP boundaries.

const FOOTBALL_SKU = 'FOOTBALL';

/**
 *
 * @param {{requestText?: string}} request Exact product request.
 * @returns {{matched: boolean, skuId: string|null}} Product match.
 */
export function exactLookup(request) {
  return request.requestText === 'football'
    ? { matched: true, skuId: FOOTBALL_SKU }
    : { matched: false, skuId: null };
}

/**
 * Validate the temporal coherence of a normalized possession interval.
 * @param {{startPoint?: {timestamp?: string}, endPoint?: {timestamp?: string}}} context Normalized possession points.
 * @returns {{valid: true} | {valid: false, reason: string}} Validation result.
 */
export function validatePossessionContextTime({ startPoint, endPoint } = {}) {
  const start = parseTime(startPoint?.timestamp);
  if (!Number.isFinite(start))
    return { valid: false, reason: 'invalid-possession-start-time' };
  const end = parseTime(endPoint?.timestamp);
  if (!Number.isFinite(end))
    return { valid: false, reason: 'invalid-possession-end-time' };
  if (end < start)
    return { valid: false, reason: 'possession-end-before-start' };
  return { valid: true };
}

/**
 *
 * @param {unknown} start Candidate start.
 * @param {unknown} end Candidate end.
 * @param {unknown} windowStart Available start.
 * @param {unknown} windowEnd Available end.
 * @returns {boolean} Whether the interval fits inclusively.
 */
export function contained(start, end, windowStart, windowEnd) {
  const values = [start, end, windowStart, windowEnd].map(parseTime);
  return (
    values[0] <= values[1] && values[2] <= values[0] && values[1] <= values[3]
  );
}

/**
 *
 * @param {number} durationSeconds Required duration.
 * @param {unknown} earliestStart Earliest allowed instant.
 * @param {unknown} latestEnd Latest allowed instant.
 * @returns {{feasible: boolean, reason?: string, startTimestamp?: string, endTimestamp?: string}} Placement result.
 */
export function latestPlacement(durationSeconds, earliestStart, latestEnd) {
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0)
    return { feasible: false, reason: 'invalid-duration' };
  const earliest = parseTime(earliestStart),
    end = parseTime(latestEnd);
  const start = end - durationSeconds * 1000;
  if (!Number.isFinite(earliest) || !Number.isFinite(end) || start < earliest)
    return { feasible: false, reason: 'no-placement' };
  return { feasible: true, startTimestamp: iso(start), endTimestamp: iso(end) };
}

/**
 *
 * @param {{startTimestamp: string, endTimestamp: string}} interval Candidate interval.
 * @param {Array<Record<string, unknown>>} schedule Shift windows.
 * @param {Array<Record<string, unknown>>} commitments Occupied windows.
 * @returns {{feasible: boolean, reason?: string}} Runner feasibility.
 */
export function runnerInterval(interval, schedule, commitments) {
  if (!interval || !Array.isArray(schedule) || !Array.isArray(commitments))
    return { feasible: false, reason: 'invalid-runner-input' };
  const fits = schedule.some(window =>
    contained(
      interval.startTimestamp,
      interval.endTimestamp,
      windowStart(window),
      windowEnd(window)
    )
  );
  if (!fits) return { feasible: false, reason: 'outside-shift' };
  const blocked = commitments.some(commitment =>
    overlap(
      interval.startTimestamp,
      interval.endTimestamp,
      windowStart(commitment),
      windowEnd(commitment)
    )
  );
  return blocked
    ? { feasible: false, reason: 'runner-commitment-overlap' }
    : { feasible: true };
}

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
  const end = startTime + request.pickupDurationSeconds * 1000;
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
 * @param {unknown} value Candidate timestamp.
 * @returns {number} Epoch milliseconds or NaN.
 */
export function parseTime(value) {
  const time = Date.parse(String(value));
  return Number.isFinite(time) ? time : NaN;
}

/**
 *
 * @param {{timestamp?: string}|undefined} point Optional spacetime point.
 * @returns {string|undefined} Point timestamp.
 */
export function pointTimestamp(point) {
  return point?.timestamp;
}

/**
 *
 * @param {{startTimestamp: string, endTimestamp: string}} candidate Candidate placement.
 * @param {Record<string, unknown>} request Runner context.
 * @returns {Record<string, unknown>} Placement with runner feasibility.
 */
function withRunner(candidate, request) {
  return {
    ...candidate,
    ...runnerInterval(
      candidate,
      request.runnerSchedule,
      request.runnerCommitments
    ),
  };
}

/**
 *
 * @param {unknown} start First interval start.
 * @param {unknown} end First interval end.
 * @param {unknown} otherStart Second interval start.
 * @param {unknown} otherEnd Second interval end.
 * @returns {boolean} Whether the half-open intervals overlap.
 */
function overlap(start, end, otherStart, otherEnd) {
  const values = [start, end, otherStart, otherEnd].map(parseTime);
  return values[0] < values[3] && values[2] < values[1];
}

/**
 *
 * @param {Record<string, unknown>} window Shift or commitment window.
 * @returns {unknown} Start timestamp in the supported window shape.
 */
function windowStart(window) {
  return (
    window.startTimestamp ||
    window.clockInTimestamp ||
    window.clockInPoint?.timestamp
  );
}

/**
 *
 * @param {Record<string, unknown>} window Shift or commitment window.
 * @returns {unknown} End timestamp in the supported window shape.
 */
function windowEnd(window) {
  return (
    window.endTimestamp ||
    window.clockOutTimestamp ||
    window.clockOutPoint?.timestamp
  );
}

/**
 *
 * @param {number} time Epoch milliseconds.
 * @returns {string} UTC ISO timestamp.
 */
function iso(time) {
  return new Date(time).toISOString();
}
