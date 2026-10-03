// @ts-nocheck -- HTTP adapter values are normalized by the core boundary.
import { createObjectMinuteRentalSearch } from './search-application.js';
import { SOPHIE_CHARLOTTE_SERVICE_AREA } from './service-area.js';
import { executeSearchHttpRequest } from './request/index.js';
export { normalizeRequest, dailyWindow } from './request/index.js';

const DEFAULT_RUNNER_ID = 'RUNNER-1';

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
  return executeSearchHttpRequest.bind(null, {
    search,
    env,
    clock,
    runnerScheduleProvider,
    allowedOrigins,
    defaultRunnerId: DEFAULT_RUNNER_ID,
  });
}
