// @ts-nocheck -- HTTP adapter values are normalized by the core boundary.
import { createObjectMinuteRentalSearch } from './search-application.js';

const DEFAULT_RUNNER_ID = 'RUNNER-1';
const DEFAULT_SUPPLIER = {
  startTimestamp: '2026-01-01T07:00:00Z',
  endTimestamp: '2026-01-01T17:00:00Z',
};

/**
 * Create the stateless search HTTP adapter.
 * @param {{runnerCommitmentsRepository: object, env?: Record<string, string|undefined>, clock?: () => Date}} options Dependencies.
 * @returns {(req: {body?: unknown}, res: {status: (code: number) => {json: (body: unknown) => void}, json: (body: unknown) => void}) => Promise<void>} HTTP handler.
 */
export function createSearchHttpHandler({
  runnerCommitmentsRepository,
  env = process.env,
  clock = () => new Date(),
}) {
  const search = createObjectMinuteRentalSearch({
    runnerCommitmentsRepository,
    runnerId: env.SEARCH_RUNNER_ID ?? DEFAULT_RUNNER_ID,
  });
  return async (req, res) => {
    try {
      const request = normalizeRequest(req.body, env, clock);
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
        DEFAULT_SUPPLIER.startTimestamp
      ),
      endTimestamp: dailyWindow(
        env.SEARCH_SUPPLIER_END ?? '17:00',
        deliveryPoint.timestamp,
        DEFAULT_SUPPLIER.endTimestamp
      ),
    },
    runnerSchedule: parseSchedule(env.SEARCH_RUNNER_SCHEDULE_JSON),
    nowTimestamp: now.toISOString(),
  };
}

/**
 * @param {string} value Window value.
 * @param {string} timestamp Reference timestamp.
 * @param {string} fallback Fallback window value.
 * @returns {string} ISO timestamp or fallback value.
 */
export function dailyWindow(value, timestamp, fallback) {
  if (!/^\d{2}:\d{2}$/.test(value)) return value || fallback;
  const date = String(timestamp).slice(0, 10);
  return `${date}T${value}:00Z`;
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
  if (!Array.isArray(schedule))
    throw new Error('Invalid runner schedule configuration.');
  return schedule;
}
