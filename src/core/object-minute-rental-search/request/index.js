import { durationMilliseconds } from '../timing.js';

/**
 * Execute HTTP request interpretation at the search request boundary.
 * @param {{ search: (request: ReturnType<typeof normalizeRequest>) => Promise<object>, env: Record<string, string | undefined>, clock: () => Date, runnerScheduleProvider?: { getSchedule: (input: { runnerId: string }) => Promise<object[]> }, allowedOrigins: string[], defaultRunnerId: string }} context Search application and live request dependencies.
 * @param {{ body?: unknown, method?: string, headers?: { origin?: string } }} req HTTP request.
 * @param {{ json: (body: unknown) => void, status: (code: number) => { json: (body: unknown) => void }, setHeader?: (name: string, value: string) => void }} res HTTP response.
 * @returns {Promise<void>} Completion after response delivery.
 */
export async function executeSearchHttpRequest(context, req, res) {
  const search = context.search;
  const origin = req?.headers?.origin;
  if (origin && context.allowedOrigins.includes(origin)) {
    res.setHeader?.('Access-Control-Allow-Origin', origin);
    res.setHeader?.('Vary', 'Origin');
    res.setHeader?.('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader?.('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req?.method === 'OPTIONS') {
    res.status(204).json({});
    return;
  }
  if (req?.method && req.method !== 'POST') {
    res.status(405).json({ valid: false, reason: 'Method not allowed.' });
    return;
  }
  try {
    const request = normalizeRequest(req.body, context.env, context.clock);
    request.runnerSchedule = context.runnerScheduleProvider
      ? await context.runnerScheduleProvider.getSchedule({
          runnerId: context.env.SEARCH_RUNNER_ID ?? context.defaultRunnerId,
        })
      : parseSchedule(context.env.SEARCH_RUNNER_SCHEDULE_JSON);
    res.json(await search(request));
  } catch (error) {
    sendSearchHttpFailure(res, error);
  }
}

/**
 * Serialize a search boundary failure to the existing bad-request protocol.
 * @param {{ status: (code: number) => { json: (body: unknown) => void } }} res HTTP response.
 * @param {unknown} error Request or search failure.
 * @returns {void}
 */
function sendSearchHttpFailure(res, error) {
  res.status(400).json({
    valid: false,
    reason: error instanceof Error ? error.message : String(error),
  });
}

/**
 * Parse finite non-negative numeric seconds into placement milliseconds.
 * @param {unknown} seconds Candidate duration.
 * @returns {number | null} Milliseconds, or null for malformed seconds.
 */
export function parseDurationMilliseconds(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0)
    return null;
  return durationMilliseconds(seconds);
}

/**
 * Serialize an epoch instant at the request/response boundary.
 * @param {number} time Epoch milliseconds.
 * @returns {string} UTC ISO timestamp.
 */
export function timestampFromEpoch(time) {
  return new Date(time).toISOString();
}

/**
 * Interpret a serialized availability window and return its latest placement.
 * @param {number} durationSeconds Required duration.
 * @param {unknown} earliestStart Earliest allowed instant.
 * @param {unknown} latestEnd Latest allowed instant.
 * @returns {{feasible: boolean, reason?: string, startTimestamp?: string, endTimestamp?: string}} Placement response.
 */
export function latestPlacement(durationSeconds, earliestStart, latestEnd) {
  return latestPlacementFromMilliseconds(
    parseDurationMilliseconds(durationSeconds),
    earliestStart,
    latestEnd
  );
}

/**
 * Place an already parsed duration at the latest available endpoint.
 * @param {number | null} durationMs Parsed milliseconds or malformed-input sentinel.
 * @param {unknown} earliestStart Earliest allowed instant.
 * @param {unknown} latestEnd Latest allowed instant.
 * @returns {{feasible: boolean, reason?: string, startTimestamp?: string, endTimestamp?: string}} Placement response.
 */
export function latestPlacementFromMilliseconds(
  durationMs,
  earliestStart,
  latestEnd
) {
  if (durationMs === null) {
    return { feasible: false, reason: 'invalid-duration' };
  }
  const earliest = parseTime(earliestStart);
  const end = parseTime(latestEnd);
  const start = end - durationMs;
  if (!Number.isFinite(earliest) || !Number.isFinite(end) || start < earliest) {
    return { feasible: false, reason: 'no-placement' };
  }
  return {
    feasible: true,
    startTimestamp: timestampFromEpoch(start),
    endTimestamp: timestampFromEpoch(end),
  };
}

/**
 *
 * @param {{startTimestamp?: unknown, endTimestamp?: unknown}} interval Candidate interval.
 * @param {unknown} schedule Shift windows.
 * @param {unknown} commitments Occupied windows.
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
 * @param {{startTimestamp?: unknown, endTimestamp?: unknown}} candidate Candidate placement.
 * @param {Record<string, unknown>} request Runner context.
 * @returns {Record<string, unknown>} Placement with runner feasibility.
 */
export function withRunner(candidate, request) {
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
 * Apply placement and external constraints before consulting runner availability.
 * @param {{feasible: boolean, reason?: string, startTimestamp?: string, endTimestamp?: string}} candidate Placement result.
 * @param {Record<string, unknown>} request Runner context.
 * @param {string | null} [constraintReason] Caller-specific placement rejection.
 * @returns {Record<string, unknown>} Original placement failure or runner result.
 */
export function withPlacementRunner(
  candidate,
  request,
  constraintReason = null
) {
  if (!candidate.feasible) return candidate;
  return constraintReason === null
    ? withRunner(candidate, request)
    : { feasible: false, reason: constraintReason };
}

/**
 *
 * @param {Record<string, any>} window Shift or commitment window.
 * @returns {unknown} Start timestamp in the supported window shape.
 */
export function windowStart(window) {
  return (
    window.startTimestamp ||
    window.clockInTimestamp ||
    window.clockInPoint?.timestamp
  );
}

/**
 *
 * @param {Record<string, any>} window Shift or commitment window.
 * @returns {unknown} End timestamp in the supported window shape.
 */
export function windowEnd(window) {
  return (
    window.endTimestamp ||
    window.clockOutTimestamp ||
    window.clockOutPoint?.timestamp
  );
}

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
 * @param {unknown} start First interval start.
 * @param {unknown} end First interval end.
 * @param {unknown} otherStart Second interval start.
 * @param {unknown} otherEnd Second interval end.
 * @returns {boolean} Whether the half-open intervals overlap.
 */
export function overlap(start, end, otherStart, otherEnd) {
  const values = [start, end, otherStart, otherEnd].map(parseTime);
  return values[0] < values[3] && values[2] < values[1];
}

const DEFAULT_SUPPLIER = {
  startTimestamp: '2026-01-01T07:00:00Z',
  endTimestamp: '2026-01-01T17:00:00Z',
};
const DEFAULT_SUPPLIER_TIME_ZONE = 'UTC';

/**
 * Parse a candidate timestamp without changing invalid-input NaN semantics.
 * @param {unknown} value Candidate timestamp.
 * @returns {number} Epoch milliseconds or NaN.
 */
export function parseTime(value) {
  const time = Date.parse(String(value));
  return Number.isFinite(time) ? time : NaN;
}

/**
 * @param {unknown} body Request body.
 * @param {Record<string, string|undefined>} env Environment values.
 * @param {() => Date} clock Current-time provider.
 * @returns {{requestText: string, deliveryPoint: Record<string, any>, pickupPoint: Record<string, any>, durations: {deliveryOutboundSeconds: number, procurementSeconds: number, pickupReturnSeconds: number}, supplierAvailability: {startTimestamp: string, endTimestamp: string}, runnerSchedule: object[], nowTimestamp: string}} Normalized search request.
 */
export function normalizeRequest(body, env, clock) {
  if (!body || typeof body !== 'object')
    throw new Error('A JSON search request is required.');
  const request = /** @type {Record<string, any>} */ (body);
  const possession = request.possessionContext;
  const deliveryPoint = possession?.startPoint ?? request.deliveryPoint;
  const pickupPoint = possession?.endPoint ?? request.pickupPoint;
  if (!deliveryPoint?.timestamp || !pickupPoint?.timestamp)
    throw new Error(
      'A possession context with start and end timestamps is required.'
    );
  const now = clock();
  if (!(now instanceof Date) || !Number.isFinite(now.getTime()))
    throw new Error('The clock returned an invalid time.');
  return {
    requestText: request.requestText ?? request.searchText,
    deliveryPoint,
    pickupPoint,
    durations: {
      deliveryOutboundSeconds: numberEnv(
        env.SEARCH_DELIVERY_OUTBOUND_SECONDS,
        2700
      ),
      procurementSeconds: numberEnv(env.SEARCH_PROCUREMENT_SECONDS, 1800),
      pickupReturnSeconds: numberEnv(env.SEARCH_PICKUP_RETURN_SECONDS, 2700),
    },
    supplierAvailability: {
      startTimestamp: dailyWindow(
        env.SEARCH_SUPPLIER_START ?? '07:00',
        deliveryPoint.timestamp,
        DEFAULT_SUPPLIER.startTimestamp,
        env.SEARCH_SUPPLIER_TIME_ZONE ?? DEFAULT_SUPPLIER_TIME_ZONE
      ),
      endTimestamp: dailyWindow(
        env.SEARCH_SUPPLIER_END ?? '17:00',
        deliveryPoint.timestamp,
        DEFAULT_SUPPLIER.endTimestamp,
        env.SEARCH_SUPPLIER_TIME_ZONE ?? DEFAULT_SUPPLIER_TIME_ZONE
      ),
    },
    runnerSchedule: [],
    nowTimestamp: now.toISOString(),
  };
}

/**
 * @param {string} value Window value.
 * @param {string} timestamp Reference timestamp.
 * @param {string} fallback Fallback window value.
 * @param {string} timeZone IANA timezone used for local wall-clock conversion.
 * @returns {string} ISO timestamp or fallback value.
 */
export function dailyWindow(
  value,
  timestamp,
  fallback,
  timeZone = DEFAULT_SUPPLIER_TIME_ZONE
) {
  const localTime = parseLocalTime(value);
  if (!localTime) return value || fallback;
  try {
    return zonedLocalTimeToUtc(timestamp, localTime, timeZone);
  } catch (error) {
    if (error instanceof RangeError) return value;
    return fallback;
  }
}

/**
 * Parse a daily wall-clock time into its numeric components.
 * @param {string} value Candidate HH:MM time.
 * @returns {{hour: number, minute: number}|null} Parsed time or null.
 */
function parseLocalTime(value) {
  const match = /^(\d{2}):([0-5]\d)$/.exec(value);
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
}

/**
 * Convert a local wall-clock time in an IANA timezone to an ISO UTC timestamp.
 * @param {string} timestamp Reference instant used to derive the local date.
 * @param {{hour: number, minute: number}} localTime Parsed local time.
 * @param {string} timeZone IANA timezone.
 * @returns {string} ISO UTC timestamp.
 */
function zonedLocalTimeToUtc(timestamp, localTime, timeZone) {
  const instant = new Date(timestamp);
  if (!Number.isFinite(instant.getTime()))
    throw new Error('Invalid timestamp.');
  const dateParts = formatParts(instant, timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const guess = Date.UTC(
    Number(dateParts.year),
    Number(dateParts.month) - 1,
    Number(dateParts.day),
    localTime.hour,
    localTime.minute
  );
  const represented = formatParts(new Date(guess), timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const representedUtc = Date.UTC(
    Number(represented.year),
    Number(represented.month) - 1,
    Number(represented.day),
    Number(represented.hour),
    Number(represented.minute)
  );
  return new Date(guess - (representedUtc - guess))
    .toISOString()
    .replace('.000Z', 'Z');
}

/**
 * Format an instant into named timezone parts.
 * @param {Date} date Instant to format.
 * @param {string} timeZone IANA timezone.
 * @param {Intl.DateTimeFormatOptions} options Intl date-time options.
 * @returns {Record<string, string>} Named formatted parts.
 */
function formatParts(date, timeZone, options) {
  return new Intl.DateTimeFormat('en-US', { timeZone, ...options })
    .formatToParts(date)
    .reduce((parts, part) => {
      if (part.type !== 'literal') parts[part.type] = part.value;
      return parts;
    }, /** @type {Record<string, string>} */ ({}));
}
/**
 * @param {string|undefined} value Environment value.
 * @param {number} fallback Default number.
 * @returns {number} Non-negative duration value.
 */
function numberEnv(value, fallback) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number) || number < 0)
    throw new Error('Invalid search duration configuration.');
  return number;
}

/**
 * @param {string|undefined} value Serialized schedule.
 * @returns {object[]} Parsed schedule entries.
 */
export function parseSchedule(value) {
  // The deployed composition always injects runnerScheduleProvider. This
  // fixture remains for direct adapter tests and legacy local callers only.
  const schedule = JSON.parse(
    value ??
      '[{"startTimestamp":"2026-01-01T00:00:00Z","endTimestamp":"2030-01-01T00:00:00Z"}]'
  );
  if (
    !Array.isArray(schedule) ||
    schedule.some(
      /**
       * @param {{startTimestamp?: string, endTimestamp?: string}} window Schedule entry.
       * @returns {boolean} Whether the interval is invalid.
       */ window => {
        const start = Date.parse(String(window?.startTimestamp));
        const end = Date.parse(String(window?.endTimestamp));
        return !Number.isFinite(start) || !Number.isFinite(end) || end < start;
      }
    )
  )
    throw new Error('Invalid runner schedule configuration.');
  return schedule;
}
