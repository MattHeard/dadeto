/**
 * @typedef {{ variant: string, createdAt: any }} ModerationReport
 */

/**
 * @typedef {{
 *   addModerationReport: (report: ModerationReport) => Promise<void>,
 *   getServerTimestamp: () => any,
 * }} ReportForModerationDeps
 */

/**
 * Guard to ensure dependency functions are provided.
 * @param {unknown} candidate Potential function implementation.
 * @param {string} name Human readable dependency name.
 */
function assertFunction(candidate, name) {
  if (typeof candidate !== 'function') {
    throw new TypeError(`${name} must be a function`);
  }
}

/**
 * Determine whether the request body supplies a variant string.
 * @param {{ variant?: string } | undefined} body Request payload supplied by the caller.
 * @returns {boolean} True when a string variant is present.
 */
function hasVariantString(body) {
  if (!body) {
    return false;
  }

  return typeof body.variant === 'string';
}

/**
 * Extract a trimmed variant identifier from the incoming request body.
 * @param {{ variant?: string } | undefined} body Request payload supplied by the caller.
 * @returns {string} Trimmed variant slug or an empty string when absent.
 */
function resolveVariant(body) {
  if (!hasVariantString(body)) {
    return '';
  }

  return body.variant.trim();
}

/**
 * Handle persistence workflow for POST requests.
 * @param {object} options Request context for handling the POST submission.
 * @param {{ variant?: string } | undefined} options.body Request payload supplied by the caller.
 * @param {ReportForModerationDeps['addModerationReport']} options.addModerationReport Persistence hook for moderation reports.
 * @param {ReportForModerationDeps['getServerTimestamp']} options.getServerTimestamp Timestamp generator.
 * @returns {Promise<{ status: number, body: any }>} Structured HTTP response for the request.
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
 * Create an HTTP handler that persists moderation report requests.
 * @param {ReportForModerationDeps} deps Dependency hooks for persistence and timestamp generation.
 * @returns {(request: { method: string, body?: { variant?: string } }) => Promise<{status: number, body: any}>} Handler processing moderation report submissions.
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
