import { assertFunction, isNonNullObject } from '../../commonCore.js';

/**
 * @typedef {Record<string, unknown>} ErrorBeaconPayload
 */

/**
 * Validate a browser beacon payload.
 * @param {unknown} body Request payload.
 * @returns {body is ErrorBeaconPayload} True when the payload is a plain object.
 */
export function isErrorBeaconPayload(body) {
  return isNonNullObject(body) && !Array.isArray(body);
}

/**
 * Build the Google Error Reporting event payload.
 * @param {ErrorBeaconPayload} payload Normalized browser payload.
 * @param {string} projectId GCP project identifier.
 * @param {() => string} getServerTimestamp RFC3339 timestamp string producer.
 * @returns {Record<string, unknown>} Google Error Reporting event payload.
 */
export function buildReportedErrorEvent(
  payload,
  projectId,
  getServerTimestamp
) {
  const message = normalizeText(payload.message);
  const stack = normalizeText(payload.stack);
  const url = normalizeText(payload.url);
  const userAgent = normalizeText(payload.userAgent);
  const timestamp = getServerTimestamp();
  const reportMessage = [message, stack].filter(Boolean).join('\n');

  return {
    message: reportMessage || message || stack || 'browser error beacon',
    context: {
      reportLocation: {
        filePath: url || 'browser',
        functionName: normalizeText(payload.source) || 'browser',
      },
      user: userAgent || undefined,
      httpRequest: undefined,
    },
    serviceContext: {
      service: projectId,
    },
    eventTime: timestamp,
  };
}

/**
 * Normalize a text-like value.
 * @param {unknown} value Candidate value.
 * @returns {string} Trimmed string or empty string.
 */
function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

/**
 * Create a request handler that forwards browser error beacons to Error Reporting.
 * @param {{
 *   projectId: string,
 *   reportEvent: (event: Record<string, unknown>) => Promise<void>,
 *   getServerTimestamp: () => string,
 * }} deps Dependencies.
 * @returns {(request: { method?: string, body?: unknown }, response: { status: (code: number) => { json: (body: Record<string, unknown>) => void, send: (body: string) => void, end: () => void } }) => Promise<void>} Request handler.
 */
export function createErrorBeaconHandler({
  projectId,
  reportEvent,
  getServerTimestamp,
}) {
  assertFunction(reportEvent, 'reportEvent');
  assertFunction(getServerTimestamp, 'getServerTimestamp');

  return async function handleErrorBeacon(request, response) {
    if (request.method !== 'POST') {
      response.status(405).send('POST only');
      return;
    }

    if (!isErrorBeaconPayload(request.body)) {
      response.status(400).json({ error: 'Expected JSON object payload' });
      return;
    }

    try {
      await reportEvent(
        buildReportedErrorEvent(request.body, projectId, getServerTimestamp)
      );
      response.status(204).end();
    } catch (error) {
      let message = 'Unknown server error';
      if (error instanceof Error) {
        const resolvedMessage = error.message;
        if (typeof resolvedMessage === 'string' && resolvedMessage.length > 0) {
          message = resolvedMessage;
        }
      }
      response.status(500).json({
        error: message,
      });
    }
  };
}
