// @ts-nocheck -- HTTP adapter values are normalized by the core boundary.
import { createObjectMinuteRentalSearch } from './search-application.js';
import { SOPHIE_CHARLOTTE_SERVICE_AREA } from './service-area.js';
import { normalizeRequest, parseSchedule } from './request/index.js';
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
