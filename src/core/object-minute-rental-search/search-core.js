/* eslint-disable jsdoc/require-jsdoc */
// @ts-nocheck -- this module is consumed through validated HTTP boundaries.

const FOOTBALL_SKU = 'FOOTBALL';

export function exactLookup(request) {
  return request.requestText === 'football'
    ? { matched: true, skuId: FOOTBALL_SKU }
    : { matched: false, skuId: null };
}

export function contained(start, end, windowStart, windowEnd) {
  const values = [start, end, windowStart, windowEnd].map(parseTime);
  return (
    values[0] <= values[1] && values[2] <= values[0] && values[1] <= values[3]
  );
}

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

export function searchResult(request) {
  const lookup = exactLookup(request);
  if (!lookup.matched) return { valid: true, results: [] };
  const result = composed(request);
  return {
    valid: true,
    results: result.feasible ? [{ skuId: lookup.skuId }] : [],
  };
}

export function parseTime(value) {
  const time = Date.parse(String(value));
  return Number.isFinite(time) ? time : NaN;
}

export function pointTimestamp(point) {
  return point?.timestamp;
}

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

function overlap(start, end, otherStart, otherEnd) {
  const values = [start, end, otherStart, otherEnd].map(parseTime);
  return values[0] < values[3] && values[2] < values[1];
}

function windowStart(window) {
  return (
    window.startTimestamp ||
    window.clockInTimestamp ||
    window.clockInPoint?.timestamp
  );
}

function windowEnd(window) {
  return (
    window.endTimestamp ||
    window.clockOutTimestamp ||
    window.clockOutPoint?.timestamp
  );
}

function iso(time) {
  return new Date(time).toISOString();
}
