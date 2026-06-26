import { assertFunction, trimmedStringOrEmpty } from '../../commonCore.js';
import {
  createCorsOriginHandler,
  createCorsOptions as buildCorsOptions,
} from '../cloud-core.js';
import { whenPostRequestAsync } from '../http-method-guard.js';

/**
 *
 * @param body
 */
/**
 * Map the request body variant field to a trimmed display string.
 * @param {{ variant?: unknown } | null | undefined} body Incoming request body.
 * @returns {string} Trimmed variant string or an empty string.
 */
function resolveVariant(body) {
  return trimmedStringOrEmpty(body?.variant);
}

/**
 * Handle a POST request for creating a moderation report.
 * @param {object} root0 Dependencies for handling the request.
 * @param {{ variant?: unknown } | null | undefined} root0.body Request payload sent by the client.
 * @param {(report: { variant: string, createdAt: unknown }) => Promise<void> | void} root0.addModerationReport Persist a new moderation report record.
 * @param {(reporterIdentity: string, variant: string) => Promise<boolean> | boolean} [root0.hasModerationReport] Check whether the reporter already reported the page.
 * @param {() => unknown} root0.getServerTimestamp Provide a timestamp used when storing the report.
 * @returns {Promise<{ status: number, body: string | Record<string, unknown> }>} Response details consumed by the HTTP adapter.
 */
async function handlePostRequest({
  body,
  addModerationReport,
  hasModerationReport,
  getServerTimestamp,
}) {
  const variant = resolveVariant(body);
  const reporterIdentity = resolveReporterIdentity(body);

  if (!variant) {
    return {
      status: 400,
      body: 'Missing or invalid variant',
    };
  }

  if (!reporterIdentity) {
    return {
      status: 400,
      body: 'Missing or invalid reporter identity',
    };
  }

  if (await alreadyReported(hasModerationReport, reporterIdentity, variant)) {
    return {
      status: 409,
      body: 'Report already exists',
    };
  }

  await addModerationReport({
    variant,
    reporterIdentity,
    createdAt: getServerTimestamp(),
  });

  const responseBody = /** @type {Record<string, unknown>} */ ({});
  return {
    status: 201,
    body: responseBody,
  };
}

/**
 * Build an HTTP handler that accepts moderation report submissions.
 * @param {object} root0 Dependencies required to process requests.
 * @param {(report: { variant: string, createdAt: unknown }) => Promise<void> | void} root0.addModerationReport Function used to persist new reports.
 * @param {(reporterIdentity: string, variant: string) => Promise<boolean> | boolean} [root0.hasModerationReport] Function used to detect duplicates.
 * @param {() => unknown} root0.getServerTimestamp Retrieve the timestamp for stored reports.
 * @returns {(request?: { method?: string, body?: { variant?: unknown } | null }) => Promise<{ status: number, body: string | Record<string, unknown> }>} Request handler that returns status and body details.
 */
export function createReportForModerationHandler({
  addModerationReport,
  hasModerationReport,
  getServerTimestamp,
}) {
  assertFunction(addModerationReport, 'addModerationReport');
  assertFunction(getServerTimestamp, 'getServerTimestamp');

  return function reportForModerationHandler(request = {}) {
    return processReportSubmission({
      request,
      addModerationReport,
      hasModerationReport,
      getServerTimestamp,
    });
  };
}

/**
 * Process the moderation report request when the HTTP method is validated.
 * @param {object} root0 Dependencies required for processing.
 * @param {{ method?: string, body?: { variant?: unknown } | null }} root0.request Incoming request details.
 * @param {(report: { variant: string, createdAt: unknown }) => Promise<void> | void} root0.addModerationReport Storage helper.
 * @param {(reporterIdentity: string, variant: string) => Promise<boolean> | boolean} [root0.hasModerationReport] Storage helper for duplicate detection.
 * @param {() => unknown} root0.getServerTimestamp Timestamp generator.
 * @returns {Promise<{ status: number, body: string | Record<string, unknown> }>} Promise resolved with the HTTP response.
 */
function processReportSubmission({
  request,
  addModerationReport,
  hasModerationReport,
  getServerTimestamp,
}) {
  return whenPostRequestAsync({
    request,
    onValid: () =>
      handlePostRequest({
        body: request.body,
        addModerationReport,
        hasModerationReport,
        getServerTimestamp,
      }),
  });
}

/**
 * Resolve the reporter identity from the request body.
 * @param {{ reporterIdentity?: unknown, reporterId?: unknown, anonymousReporterId?: unknown } | null | undefined} body Request payload.
 * @returns {string} Trimmed reporter identity or an empty string.
 */
function resolveReporterIdentity(body) {
  return (
    resolveReporterIdentityField(body?.reporterIdentity) ||
    resolveReporterIdentityField(body?.reporterId) ||
    resolveReporterIdentityField(body?.anonymousReporterId)
  );
}

/**
 * Normalize a reporter identity field.
 * @param {unknown} value Candidate identity value.
 * @returns {string} Trimmed reporter identity or an empty string.
 */
function resolveReporterIdentityField(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Check whether a reporter already reported a page.
 * @param {(reporterIdentity: string, variant: string) => Promise<boolean> | boolean | undefined} hasModerationReport Duplicate detector.
 * @param {string} reporterIdentity Reporter identity.
 * @param {string} variant Variant slug.
 * @returns {Promise<boolean>} True when the report already exists.
 */
async function alreadyReported(hasModerationReport, reporterIdentity, variant) {
  if (typeof hasModerationReport !== 'function') {
    return false;
  }

  return Boolean(await hasModerationReport(reporterIdentity, variant));
}

/**
 * Compute the moderation urgency for a page using the allowed page-level signals.
 * @param {object} page Page state.
 * @param {number} page.reportCount Total accepted reports.
 * @param {number} page.reportRecency Recent report signal in the range [0, 1].
 * @param {number} page.pageAge Page age signal in the range [0, 1].
 * @param {number} page.timeSinceLastReview Time since last review signal in the range [0, 1].
 * @param {number} page.visibilityDistanceFromThreshold Distance to the 0.5 visibility threshold in the range [0, 1].
 * @param {number} page.moderationCount Total moderation count.
 * @returns {number} Moderation urgency in the range [0, 1].
 */
export function computeModerationUrgency(page) {
  const reportCountSignal = clamp01(page.reportCount / 5);
  const reportRecencySignal = clamp01(page.reportRecency);
  const pageAgeSignal = clamp01(page.pageAge);
  const timeSinceLastReviewSignal = clamp01(page.timeSinceLastReview);
  const visibilityDistanceSignal = clamp01(page.visibilityDistanceFromThreshold);
  const moderationCountSignal = clamp01(1 - page.moderationCount / 5);

  return clamp01(
    reportCountSignal * 0.3 +
      reportRecencySignal * 0.2 +
      pageAgeSignal * 0.1 +
      timeSinceLastReviewSignal * 0.15 +
      visibilityDistanceSignal * 0.2 +
      moderationCountSignal * 0.05
  );
}

/**
 * Clamp a numeric value to the range [0, 1].
 * @param {number} value Value to clamp.
 * @returns {number} Clamped value.
 */
function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

/**
 * Create a validator that enforces an allow-list of origins for CORS.
 * @param {string[] | null | undefined} allowedOrigins Origins that may access the endpoint.
 * @returns {(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => void} Validation callback compatible with the CORS package.
 */
export function createCorsOriginValidator(allowedOrigins) {
  /** @type {string[]} */
  let origins = [];
  if (Array.isArray(allowedOrigins)) {
    origins = allowedOrigins;
  }
  return createCorsOriginHandler(isCorsOriginAllowed, origins);
}

/**
 * Determine whether the provided origin satisfies the CORS allow list.
 * @param {string | null | undefined} origin - Origin header emitted by the browser.
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
 * @param {(request: { method: string, body?: { variant?: unknown } | null }) => Promise<{ status: number, body: string | Record<string, unknown> }>} reportForModerationHandler Domain-specific request handler.
 * @returns {(req: { method: string, body?: { variant?: unknown } | null }, res: { status: (code: number) => { send: (body: string) => void, json: (body: Record<string, unknown>) => void }, sendStatus: (code: number) => void }) => Promise<void>} Express-compatible request handler that writes to the provided response.
 */
export function createHandleReportForModeration(reportForModerationHandler) {
  assertFunction(reportForModerationHandler, 'reportForModerationHandler');

  return async function handleReportForModeration(req, res) {
    if (req.method !== 'POST') {
      sendResponse(res, 405, 'POST only');
      return;
    }

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
  if (typeof body === 'string') {
    return (res, status) => sendResponse(res, status, body);
  }

  return resolveNonStringResponseSender(body);
}

/**
 * @param {string | Record<string, unknown> | undefined} body Response body emitted by the domain handler.
 * @returns {(res: { status: (code: number) => { send: (body: string) => void, json: (body: Record<string, unknown>) => void }, sendStatus: (code: number) => void }, status: number) => void} Response sender for the provided payload.
 */
function resolveNonStringResponseSender(body) {
  if (typeof body === 'undefined') {
    return (res, status) => sendStatusResponse(res, status);
  }

  return (res, status) =>
    sendJsonResponse(
      res,
      status,
      /** @type {Record<string, unknown>} */ (body ?? {})
    );
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
