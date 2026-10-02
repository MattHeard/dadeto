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
