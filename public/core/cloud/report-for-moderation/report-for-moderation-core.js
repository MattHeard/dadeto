import { assertFunction } from '../common-core.js';
import {
  createCorsOriginHandler,
  createCorsOptions as buildCorsOptions,
  whenBodyPresent,
} from './cloud-core.js';

/**
 * Determine whether the provided request body contains a variant string.
 * @param {{ variant?: unknown } | null | undefined} body Request payload to inspect.
 * @returns {boolean} True when a string variant is present.
 */
function hasVariantString(body) {
  return whenBodyPresent(
    body,
    candidate => typeof candidate.variant === 'string'
  );
}

/**
 * Safely extract the trimmed variant string from a request body.
 * @param {{ variant?: unknown } | null | undefined} body Request payload containing the variant field.
 * @returns {string} Trimmed variant string, or an empty string when not provided.
 */
function resolveVariant(body) {
  if (!hasVariantString(body)) {
    return '';
  }

  return body.variant.trim();
}

/**
 * Handle a POST request for creating a moderation report.
 * @param {object} root0 Dependencies for handling the request.
 * @param {{ variant?: unknown } | null | undefined} root0.body Request payload sent by the client.
 * @param {(report: { variant: string, createdAt: unknown }) => Promise<void> | void} root0.addModerationReport Persist a new moderation report record.
 * @param {() => unknown} root0.getServerTimestamp Provide a timestamp used when storing the report.
 * @returns {Promise<{ status: number, body: string | Record<string, unknown> }>} Response details consumed by the HTTP adapter.
 */
async function handlePostRequest({
  body,
  addModerationReport,
  getServerTimestamp,
}) {
  const variant = resolveVariant(body);

  if (!variant) {
    return {
      status: 400,
      body: 'Missing or invalid variant',
    };
  }

  await addModerationReport({
    variant,
    createdAt: getServerTimestamp(),
  });

  return {
    status: 201,
    body: {},
  };
}

/**
 * Build an HTTP handler that accepts moderation report submissions.
 * @param {object} root0 Dependencies required to process requests.
 * @param {(report: { variant: string, createdAt: unknown }) => Promise<void> | void} root0.addModerationReport Function used to persist new reports.
 * @param {() => unknown} root0.getServerTimestamp Retrieve the timestamp for stored reports.
 * @returns {(request: { method?: string, body?: { variant?: unknown } | null }) => Promise<{ status: number, body: string | Record<string, unknown> }>} Request handler that returns status and body details.
 */
export function createReportForModerationHandler({
  addModerationReport,
  getServerTimestamp,
}) {
  assertFunction(addModerationReport, 'addModerationReport');
  assertFunction(getServerTimestamp, 'getServerTimestamp');

  return async function reportForModerationHandler({ method, body }) {
    if (method !== 'POST') {
      return {
        status: 405,
        body: 'POST only',
      };
    }

    return handlePostRequest({
      body,
      addModerationReport,
      getServerTimestamp,
    });
  };
}

/**
 * Create a validator that enforces an allow-list of origins for CORS.
 * @param {string[] | null | undefined} allowedOrigins Origins that may access the endpoint.
 * @returns {(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => void} Validation callback compatible with the CORS package.
 */
export function createCorsOriginValidator(allowedOrigins) {
  let origins = [];
  if (Array.isArray(allowedOrigins)) {
    origins = allowedOrigins;
  }
  return createCorsOriginHandler(isCorsOriginAllowed, origins);
}

/**
 * Determine whether the provided origin satisfies the CORS allow list.
 * @param {string | undefined} origin - Origin header emitted by the browser.
 * @param {string[]} allowedOrigins - Origins explicitly permitted to access the endpoint.
 * @returns {boolean} True when the origin is either missing or present in the allow list.
 */
function isCorsOriginAllowed(origin, allowedOrigins) {
  return !origin || allowedOrigins.includes(origin);
}

/**
 * Create configuration suitable for initializing CORS middleware.
 * @param {object} root0 Options controlling the generated configuration.
 * @param {string[] | null | undefined} root0.allowedOrigins Origins that are permitted when validating requests.
 * @param {string[]} [root0.methods] HTTP methods supported by the endpoint. Defaults to ['POST'].
 * @returns {{ origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => void, methods: string[] }} Config object consumed by the CORS middleware.
 */
export function createCorsOptions({ allowedOrigins, methods = ['POST'] }) {
  const origin = createCorsOriginValidator(allowedOrigins);
  return buildCorsOptions(origin, methods);
}

/**
 * Emit a simple string response with the provided status code.
 * @param {{ status: (code: number) => { send: (body: string) => void } }} res - Express-like response object.
 * @param {number} status - HTTP status code to send.
 * @param {string} body - String body to send in the response.
 * @returns {void}
 */
function sendResponse(res, status, body) {
  res.status(status).send(body);
}

/**
 * Emit a bare status response.
 * @param {{ sendStatus: (code: number) => void }} res - Express-style response object.
 * @param {number} status - HTTP status code to emit.
 * @returns {void}
 */
function sendStatusResponse(res, status) {
  res.sendStatus(status);
}

/**
 * Wrap the domain handler in an Express-style request handler.
 * @param {(request: { method?: string, body?: { variant?: unknown } | null }) => Promise<{ status: number, body: string | Record<string, unknown> }>} reportForModerationHandler Domain-specific request handler.
 * @returns {(req: { method?: string, body?: { variant?: unknown } | null }, res: { status: (code: number) => { send: (body: string) => void, json: (body: Record<string, unknown>) => void }, sendStatus: (code: number) => void }) => Promise<void>} Express-compatible request handler that writes to the provided response.
 */
export function createHandleReportForModeration(reportForModerationHandler) {
  assertFunction(reportForModerationHandler, 'reportForModerationHandler');

  return async function handleReportForModeration(req, res) {
    const { status, body } = await reportForModerationHandler({
      method: req.method,
      body: req.body,
    });

    const responder = createResponseSender(body);
    responder(res, status);
  };
}

/**
 * Choose the appropriate response helper for the given body.
 * @param {string | Record<string, unknown> | undefined} body - Response body produced by the domain handler.
 * @returns {(res: { status: (code: number) => { send: (body: string) => void, json: (body: Record<string, unknown>) => void }, sendStatus: (code: number) => void }, status: number) => void} Sender that knows how to write the response.
 */
function createResponseSender(body) {
  const responders = {
    string: sendResponse,
    undefined: sendStatusResponse,
    object: sendJsonResponse,
  };

  return (res, status) => responders[typeof body](res, status, body);
}

/**
 * Emit a JSON response.
 * @param {{ status: (code: number) => { json: (body: Record<string, unknown>) => void } }} res - Express-style response object that can emit JSON.
 * @param {number} status - HTTP status code to emit.
 * @param {Record<string, unknown>} body - JSON payload to send.
 * @returns {void}
 */
function sendJsonResponse(res, status, body) {
  res.status(status).json(body);
}
