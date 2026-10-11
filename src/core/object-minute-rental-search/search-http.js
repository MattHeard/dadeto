import { executeSearchHttpRequest } from './request/index.js';

/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
export { normalizeRequest, dailyWindow } from './request/index.js';

/**
 * Create the stateless search HTTP adapter from its application context and response boundary.
 * @param {{context: SearchHttpContext, createResponseEffects: (response: SearchHttpResponse) => SearchHttpResponseEffects}} options Request execution dependencies.
 * @returns {(allowEffects: AllowEffects, req: {body?: unknown}, res: SearchHttpResponse) => Promise<void>} Permission-aware HTTP handler.
 */
export function createSearchHttpHandler({ context, createResponseEffects }) {
  return (allowEffects, req, res) =>
    executeSearchHttpRequest(
      allowEffects,
      context,
      req,
      createResponseEffects(res)
    );
}

/**
 * @typedef {object} SearchHttpContext Search application and request-time dependencies.
 * @property {(request: Record<string, unknown>) => Promise<object>} search Search application.
 * @property {Record<string, string|undefined>} env Runtime environment, read during each request.
 * @property {() => Date} clock Request clock.
 * @property {{getSchedule: (input: {runnerId: string}) => Promise<object[]>}} [runnerScheduleProvider] Optional live schedule provider.
 * @property {string[]} allowedOrigins CORS allowlist resolved when the handler is composed.
 * @property {string} defaultRunnerId Fallback runner identifier.
 */

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
