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
 * Create an HTTP handler that persists moderation report requests.
 * @param {ReportForModerationDeps} deps Dependency hooks for persistence and timestamp generation.
 * @returns {(request: { method: string, body?: { variant?: string } }) => Promise<{status: number, body: any}>} Handler processing moderation report submissions.
 */
export function createReportForModerationHandler({
  addModerationReport,
  getServerTimestamp,
}) {
  if (typeof addModerationReport !== 'function') {
    throw new TypeError('addModerationReport must be a function');
  }

  if (typeof getServerTimestamp !== 'function') {
    throw new TypeError('getServerTimestamp must be a function');
  }

  return async function reportForModerationHandler({ method, body }) {
    if (method !== 'POST') {
      return {
        status: 405,
        body: 'POST only',
      };
    }

    const { variant } = body || {};
    if (typeof variant !== 'string' || !variant.trim()) {
      return {
        status: 400,
        body: 'Missing or invalid variant',
      };
    }

    const slug = variant.trim();

    await addModerationReport({
      variant: slug,
      createdAt: getServerTimestamp(),
    });

    return {
      status: 201,
      body: {},
    };
  };
}
