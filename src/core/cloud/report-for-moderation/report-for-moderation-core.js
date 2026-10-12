import {
  assertFunction,
  trimmedStringOrEmpty,
  clampNumber,
} from '../../commonCore.js';
import {
  createCorsOriginHandler,
  createCorsOptions as buildCorsOptions,
} from '../cloud-core.js';
import { whenPostRequestAsync } from '../http-method-guard.js';
/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * @typedef {object} ReportRequestBody
 * @property {unknown} [variant] Variant identifier supplied by the client.
 * @property {unknown} [reporterIdentity] Logged-in reporter identity.
 * @property {unknown} [reporterId] Alternate reporter identity field.
 * @property {unknown} [anonymousReporterId] Anonymous reporter identity field.
 */

/**
 * @typedef {object} ModerationReportRecord
 * @property {string} reporterIdentity Reporter identity.
 * @property {string} variant Variant identifier.
 * @property {unknown} createdAt Timestamp stored with the report.
 */

/**
 * Map the request body variant field to a trimmed display string.
 * @param {ReportRequestBody | null | undefined} body Incoming request body.
 * @returns {string} Trimmed variant string or an empty string.
 */
function resolveVariant(body) {
  return trimmedStringOrEmpty(body?.variant);
}

/**
 * Build an HTTP handler that accepts moderation report submissions.
 * @param {object} dependencies Dependencies required to process requests.
 * @param {(permission: AllowEffects, report: ModerationReportRecord) => Promise<void> | void} dependencies.addModerationReport Function used to persist new reports.
 * @param {((reporterIdentity: string, variant: string) => Promise<boolean> | boolean) | undefined} [dependencies.hasModerationReport] Function used to detect duplicates.
 * @param {() => unknown} dependencies.getServerTimestamp Retrieve the timestamp for stored reports.
 * @returns {(permission: AllowEffects, request?: { method?: string, body?: ReportRequestBody | null }) => Promise<{ status: number, body: string | Record<string, unknown> }>} Request handler that returns status and body details.
 */
export function createReportForModerationHandler(dependencies) {
  assertFunction(dependencies.addModerationReport, 'addModerationReport');
  assertFunction(dependencies.getServerTimestamp, 'getServerTimestamp');

  return (permission, request = {}) =>
    processReportSubmission(dependencies, permission, request);
}

/**
 * Process the moderation report request when the HTTP method is validated.
 * @param {{addModerationReport: (permission: AllowEffects, report: ModerationReportRecord) => Promise<void> | void, hasModerationReport?: (reporterIdentity: string, variant: string) => Promise<boolean> | boolean, getServerTimestamp: () => unknown}} dependencies Dependencies required for processing.
 * @param {AllowEffects} permission Explicit command permission.
 * @param {{ method?: string, body?: ReportRequestBody | null }} request Incoming request details.
 * @returns {Promise<{ status: number, body: string | Record<string, unknown> }>} Promise resolved with the HTTP response.
 */
function processReportSubmission(dependencies, permission, request) {
  return whenPostRequestAsync({
    request,
    onValid: async () => {
      const body = request.body;
      const variant = resolveVariant(body);
      const reporterIdentity = resolveReporterIdentity(body);

      if (!variant) {
        return missingReportField('variant');
      }

      if (!reporterIdentity) {
        return missingReportField('reporter identity');
      }

      if (
        await alreadyReported(
          dependencies.hasModerationReport,
          reporterIdentity,
          variant
        )
      ) {
        return {
          status: 409,
          body: 'Report already exists',
        };
      }

      await dependencies.addModerationReport(
        /** @type {AllowEffects} */ (permission),
        {
          variant,
          reporterIdentity,
          createdAt: dependencies.getServerTimestamp(),
        }
      );

      return {
        status: 201,
        body: {},
      };
    },
  });
}

/**
 * Construct the shared rejection envelope without changing which field wins.
 * @param {'variant' | 'reporter identity'} field Missing report field.
 * @returns {{status: number, body: string}} Invalid-report response.
 */
function missingReportField(field) {
  return { status: 400, body: `Missing or invalid ${field}` };
}

/**
 * Resolve the reporter identity from the request body.
 * @param {{ reporterIdentity?: unknown, reporterId?: unknown, anonymousReporterId?: unknown } | null | undefined} body Request payload.
 * @returns {string} Trimmed reporter identity or an empty string.
 */
function resolveReporterIdentity(body) {
  return (
    trimmedStringOrEmpty(body?.reporterIdentity) ||
    trimmedStringOrEmpty(body?.reporterId) ||
    trimmedStringOrEmpty(body?.anonymousReporterId)
  );
}

/**
 * Check whether a reporter already reported a page.
 * @param {((reporterIdentity: string, variant: string) => Promise<boolean> | boolean) | undefined} hasModerationReport Duplicate detector.
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
  const visibilityDistanceSignal = clamp01(
    page.visibilityDistanceFromThreshold
  );
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

  return clampNumber(value, 0, 1);
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
 * Wrap the domain handler in an Express-style request handler.
 * @param {(permission: AllowEffects, request: { method: string, body?: { variant?: unknown } | null }) => Promise<{ status: number, body: string | Record<string, unknown> }>} reportForModerationHandler Domain-specific request handler.
 * @param {(permission: AllowEffects, response: unknown, status: number, body: string | Record<string, unknown>) => void} sendResponse Effect adapter for HTTP responses.
 * @returns {(permission: AllowEffects, req: { method: string, body?: { variant?: unknown } | null }, res: unknown) => Promise<void>} Express-compatible request handler that writes to the provided response.
 */
export function createHandleReportForModeration(
  reportForModerationHandler,
  sendResponse
) {
  assertFunction(reportForModerationHandler, 'reportForModerationHandler');
  assertFunction(sendResponse, 'sendResponse');

  return async function handleReportForModeration(permission, req, res) {
    if (req.method !== 'POST') {
      sendResponse(permission, res, 405, 'POST only');
      return;
    }

    const { status, body } = await reportForModerationHandler(permission, {
      method: req.method,
      body: req.body,
    });
    sendResponse(permission, res, status, body);
  };
}
