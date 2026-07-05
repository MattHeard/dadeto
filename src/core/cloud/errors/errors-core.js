import { assertFunction, isNonNullObject } from '../../commonCore.js';
import { sanitizeUrl } from '../../error-reporting.js';

/**
 * @typedef {Record<string, unknown>} ErrorBeaconPayload
 */

/**
 * @typedef {{ error?: (...args: unknown[]) => void }} ErrorLogger
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
 * @param {string} environment Environment label.
 * @param {() => string} getServerTimestamp RFC3339 timestamp string producer.
 * @param {string} buildVersion Deployed build identifier.
 * @returns {Record<string, unknown>} Google Error Reporting event payload.
 */
export function buildReportedErrorEvent(
  payload,
  environment,
  getServerTimestamp,
  buildVersion = ''
) {
  const message = normalizeText(payload.message);
  const stack = normalizeText(payload.stack);
  const url = sanitizeUrl(normalizeText(payload.url));
  const source = normalizeText(payload.source);
  const service = buildServiceName(environment);
  const timestamp = getServerTimestamp();
  const reportMessage = [message, stack].filter(Boolean).join('\n');

  return {
    message: reportMessage || message || stack || 'browser error beacon',
    context: createErrorContext(payload, url, source),
    serviceContext: createServiceContext(service, buildVersion),
    eventTime: timestamp,
  };
}

/**
 * Build the Error Reporting context block.
 * @param {ErrorBeaconPayload} payload Beacon payload.
 * @param {string} url Sanitized URL.
 * @param {string} source Source label.
 * @returns {{ reportLocation: Record<string, unknown> }} Error Reporting context.
 */
function createErrorContext(payload, url, source) {
  return {
    reportLocation: createReportLocation(payload, url, source),
  };
}

/**
 * Build the Error Reporting location block.
 * @param {ErrorBeaconPayload} payload Beacon payload.
 * @param {string} url Sanitized URL.
 * @param {string} source Source label.
 * @returns {Record<string, unknown>} Error Reporting report location.
 */
function createReportLocation(payload, url, source) {
  /** @type {{ filePath: string, functionName: string, lineNumber?: number, columnNumber?: number }} */
  const reportLocation = {
    filePath: url || 'browser',
    functionName: source || 'browser',
  };
  const lineNumber = normalizePositiveInteger(payload.lineNumber);
  const columnNumber = normalizePositiveInteger(payload.columnNumber);

  if (lineNumber !== undefined) {
    reportLocation.lineNumber = lineNumber;
  }

  if (columnNumber !== undefined) {
    reportLocation.columnNumber = columnNumber;
  }

  return reportLocation;
}

/**
 * Build the Error Reporting service context block.
 * @param {string} service Error Reporting service name.
 * @param {string} buildVersion Deployed build identifier.
 * @returns {{ service: string, version?: string }} Error Reporting service context.
 */
function createServiceContext(service, buildVersion) {
  const version = normalizeText(buildVersion);
  /** @type {{ service: string, version?: string }} */
  const serviceContext = { service };
  if (version) {
    serviceContext.version = version;
  }
  return serviceContext;
}

/**
 * Build the Error Reporting service name from the environment.
 * @param {string} environmentSource Environment or project identifier.
 * @returns {string} Environment-scoped client-js service name.
 */
function buildServiceName(environmentSource) {
  const environment = normalizeText(environmentSource) || 'prod';
  return `${environment}-client-js`;
}

/**
 * Normalize a potentially numeric value into a positive integer.
 * @param {unknown} value Candidate numeric value.
 * @returns {number | undefined} Positive integer or undefined.
 */
function normalizePositiveInteger(value) {
  const number = Number.parseInt(String(value), 10);
  if (!Number.isInteger(number) || number <= 0) {
    return undefined;
  }

  return number;
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
 *   environment: string,
 *   buildVersion?: string,
 *   reportEvent: (event: Record<string, unknown>) => Promise<void>,
 *   getServerTimestamp: () => string,
 *   console?: ErrorLogger,
 * }} deps Dependencies.
 * @returns {(request: { method?: string, body?: unknown }, response: { status: (code: number) => { json: (body: Record<string, unknown>) => void, send: (body: string) => void, end: () => void } }) => Promise<void>} Request handler.
 */
export function createErrorBeaconHandler({
  environment,
  buildVersion,
  reportEvent,
  getServerTimestamp,
  console: consoleLike,
}) {
  assertFunction(reportEvent, 'reportEvent');
  assertFunction(getServerTimestamp, 'getServerTimestamp');

  return async function handleErrorBeacon(request, response) {
    if (!isPostRequest(request)) {
      sendMethodNotAllowed(response);
      return;
    }

    if (!isErrorBeaconPayload(request.body)) {
      sendBadPayload(response);
      return;
    }

    try {
      await reportEvent(
        buildReportedErrorEvent(
          request.body,
          environment,
          getServerTimestamp,
          buildVersion
        )
      );
      response.status(204).end();
    } catch (error) {
      reportForwardingFailure(consoleLike, error);
      sendForwardingFailure(response, error);
    }
  };
}

/**
 * Determine whether the request is a POST submission.
 * @param {{ method?: string }} request Request object.
 * @returns {boolean} True when the request method is POST.
 */
function isPostRequest(request) {
  return request.method === 'POST';
}

/**
 * Send a 405 response for unsupported methods.
 * @param {{ status: (code: number) => { send: (body: string) => void } }} response Response object.
 */
function sendMethodNotAllowed(response) {
  response.status(405).send('POST only');
}

/**
 * Send a 400 response for malformed payloads.
 * @param {{ status: (code: number) => { json: (body: Record<string, unknown>) => void } }} response Response object.
 */
function sendBadPayload(response) {
  response.status(400).json({ error: 'Expected JSON object payload' });
}

/**
 * Send a 500 response for forwarding failures.
 * @param {{ status: (code: number) => { json: (body: Record<string, unknown>) => void } }} response Response object.
 * @param {unknown} error Forwarding error.
 */
function sendForwardingFailure(response, error) {
  response.status(500).json({
    error: resolveErrorMessage(error),
  });
}

/**
 * Log a collector failure without leaking the browser payload.
 * @param {ErrorLogger | undefined} consoleLike Logger.
 * @param {unknown} error Forwarding error.
 */
function reportForwardingFailure(consoleLike, error) {
  consoleLike?.error?.('Error Reporting API forwarding failed', error);
}

/**
 * Resolve a readable forwarding error message.
 * @param {unknown} error Forwarding error.
 * @returns {string} Human-readable message.
 */
function resolveErrorMessage(error) {
  if (error instanceof Error) {
    const resolvedMessage = error.message;
    if (typeof resolvedMessage === 'string' && resolvedMessage.length > 0) {
      return resolvedMessage;
    }
  }

  return 'Unknown server error';
}
