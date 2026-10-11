import { createObjectMinuteRentalSearch } from './search-application.js';
import { SOPHIE_CHARLOTTE_SERVICE_AREA } from './service-area.js';
import { executeSearchHttpRequest } from './request/index.js';
import { DEFAULT_RUNNER_ID } from './search-config.js';

/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
export { normalizeRequest, dailyWindow } from './request/index.js';

/**
 * Create the stateless search HTTP adapter.
 * @param {{runnerCommitmentsRepository: {listForRunner: (options: {runnerId: string}) => Promise<Array<{startTimestamp: string, endTimestamp: string}>>}, createResponseEffects: (response: SearchHttpResponse) => SearchHttpResponseEffects, env?: Record<string, string|undefined>, clock?: () => Date, serviceArea?: object, runnerScheduleProvider?: {getSchedule: (input: {runnerId: string}) => Promise<object[]>}, allowedOrigins?: string[]}} options Dependencies.
 * @returns {(allowEffects: AllowEffects, req: {body?: unknown}, res: SearchHttpResponse) => Promise<void>} Permission-aware HTTP handler.
 */
export function createSearchHttpHandler({
  runnerCommitmentsRepository,
  createResponseEffects,
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
  const context = {
    search,
    env,
    clock,
    runnerScheduleProvider,
    allowedOrigins,
    defaultRunnerId: DEFAULT_RUNNER_ID,
  };
  return (allowEffects, req, res) =>
    executeSearchHttpRequest(
      allowEffects,
      context,
      req,
      createResponseEffects(res)
    );
}

/**
 * @typedef {object} SearchHttpResponse
 * @property {(body: unknown) => unknown} json Sends a JSON response.
 * @property {(code: number) => {json: (body: unknown) => unknown}} status Sets the response status.
 * @property {(name: string, value: string) => unknown} [setHeader] Sets a response header.
 */

/**
 * @typedef {object} SearchHttpResponseEffects
 * @property {(allowEffects: AllowEffects, name: string, value: string) => unknown} setHeader Sets a response header.
 * @property {(allowEffects: AllowEffects, status: number) => unknown} setStatus Sets a response status before serialization.
 * @property {(allowEffects: AllowEffects, body: unknown, status?: number) => unknown} sendJson Sends a JSON response.
 */
