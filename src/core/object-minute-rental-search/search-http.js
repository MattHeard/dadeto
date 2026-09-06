// @ts-nocheck -- HTTP adapter values are normalized by the core boundary.
import { createObjectMinuteRentalSearch } from './search-application.js';
import { SOPHIE_CHARLOTTE_SERVICE_AREA } from './service-area.js';

const DEFAULT_RUNNER_ID = 'RUNNER-1';
const DEFAULT_SUPPLIER = {
  startTimestamp: '2026-01-01T07:00:00Z',
  endTimestamp: '2026-01-01T17:00:00Z',
};
const DEFAULT_SUPPLIER_TIME_ZONE = 'UTC';

/**
 * Create the stateless search HTTP adapter.
 * @param {{runnerCommitmentsRepository: object, env?: Record<string, string|undefined>, clock?: () => Date}} options Dependencies.
 * @returns {(req: {body?: unknown}, res: {status: (code: number) => {json: (body: unknown) => void}, json: (body: unknown) => void}) => Promise<void>} HTTP handler.
 */
export function createSearchHttpHandler({
  runnerCommitmentsRepository,
  env = process.env,
  clock = () => new Date(),
  serviceArea = SOPHIE_CHARLOTTE_SERVICE_AREA,
  runnerScheduleProvider,
  allowedOrigins = String(env.SEARCH_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
}) {
  const search = createObjectMinuteRentalSearch({
    runnerCommitmentsRepository,
    runnerId: env.SEARCH_RUNNER_ID ?? DEFAULT_RUNNER_ID,
    serviceArea,
  });
  return async (req, res) => {
    const origin = req?.headers?.origin;
    if (origin && allowedOrigins.includes(origin)) {
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
      const request = normalizeRequest(req.body, env, clock);
      request.runnerSchedule = runnerScheduleProvider
        ? await runnerScheduleProvider.getSchedule({
            runnerId: env.SEARCH_RUNNER_ID ?? DEFAULT_RUNNER_ID,
          })
        : parseSchedule(env.SEARCH_RUNNER_SCHEDULE_JSON);
      res.json(await search(request));
    } catch (error) {
      res.status(400).json({
        valid: false,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

/**
 * @param {unknown} body Request body.
 * @param {Record<string, string|undefined>} env Environment values.
 * @param {() => Date} clock Current-time provider.
 * @returns {object} Normalized search request.
 */
export function normalizeRequest(body, env, clock) {
  if (!body || typeof body !== 'object')
    throw new Error('A JSON search request is required.');
  const possession = body.possessionContext;
  const deliveryPoint = possession?.startPoint ?? body.deliveryPoint;
  const pickupPoint = possession?.endPoint ?? body.pickupPoint;
  if (!deliveryPoint?.timestamp || !pickupPoint?.timestamp)
    throw new Error(
      'A possession context with start and end timestamps is required.'
    );
  const now = clock();
  if (!(now instanceof Date) || !Number.isFinite(now.getTime()))
    throw new Error('The clock returned an invalid time.');
  return {
    requestText: body.requestText ?? body.searchText,
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
  if (!/^\d{2}:[0-5]\d$/.test(value)) return value || fallback;
  try {
    return zonedLocalTimeToUtc(timestamp, value, timeZone);
  } catch {
    return fallback;
  }
}

/**
 * Convert a local wall-clock time in an IANA timezone to an ISO UTC timestamp.
 * @param {string} timestamp Reference instant used to derive the local date.
 * @param {string} localTime Local HH:MM value.
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
    Number(localTime.slice(0, 2)),
    Number(localTime.slice(3, 5))
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
 * @param {object} options Intl date-time options.
 * @returns {Record<string, string>} Named formatted parts.
 */
function formatParts(date, timeZone, options) {
  return new Intl.DateTimeFormat('en-US', { timeZone, ...options })
    .formatToParts(date)
    .reduce((parts, part) => {
      if (part.type !== 'literal') parts[part.type] = part.value;
      return parts;
    }, {});
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
function parseSchedule(value) {
  const schedule = JSON.parse(
    value ??
      '[{"startTimestamp":"2026-01-01T00:00:00Z","endTimestamp":"2030-01-01T00:00:00Z"}]'
  );
  if (
    !Array.isArray(schedule) ||
    schedule.some(window => {
      const start = Date.parse(window?.startTimestamp);
      const end = Date.parse(window?.endTimestamp);
      return !Number.isFinite(start) || !Number.isFinite(end) || end < start;
    })
  )
    throw new Error('Invalid runner schedule configuration.');
  return schedule;
}
