import {
  assertFunction,
  isNonNullObject,
  trimmedStringOrEmpty,
} from '../../commonCore.js';
import { sanitizeUrl } from '../../error-reporting.js';

/**
 * @typedef {Record<string, unknown>} ErrorBeaconPayload
 */

/**
 * @typedef {{ error?: (...args: unknown[]) => void }} ErrorLogger
 */

/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {{ status: (code: number) => ErrorBeaconResponse, json: (body: unknown) => unknown, send: (body: string) => unknown, end: () => unknown }} ErrorBeaconResponse */
/** @typedef {(allowEffects: AllowEffects, response: ErrorBeaconResponse, status: number, body: Record<string, unknown>) => unknown} ErrorBeaconJsonResponder */
/** @typedef {(allowEffects: AllowEffects, response: ErrorBeaconResponse, status: number, body: string) => unknown} ErrorBeaconTextResponder */
/** @typedef {(allowEffects: AllowEffects, logger: ErrorLogger | undefined, message: string, error: unknown) => void} ErrorBeaconErrorLogger */

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
  const message = trimmedStringOrEmpty(payload.message);
  const stack = trimmedStringOrEmpty(payload.stack);
  const url = sanitizeUrl(trimmedStringOrEmpty(payload.url));
  const source = trimmedStringOrEmpty(payload.source);
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
  const version = trimmedStringOrEmpty(buildVersion);
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
  const environment = trimmedStringOrEmpty(environmentSource) || 'prod';
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
/**
 * Create a request handler that forwards browser error beacons to Error Reporting.
 * @param {{
 *   environment: string,
 *   buildVersion?: string,
 *   reportEvent: (event: Record<string, unknown>) => Promise<void>,
 *   getServerTimestamp: () => string,
 *   respondJson: (allowEffects: AllowEffects, response: ErrorBeaconResponse, status: number, body: Record<string, unknown>) => unknown,
 *   respondText: (allowEffects: AllowEffects, response: ErrorBeaconResponse, status: number, body: string) => unknown,
 *   respondEmpty: (allowEffects: AllowEffects, response: ErrorBeaconResponse, status: number) => unknown,
 *   logError: (allowEffects: AllowEffects, logger: ErrorLogger | undefined, message: string, error: unknown) => void,
 *   console?: ErrorLogger,
 * }} deps Dependencies.
 * @returns {(allowEffects: AllowEffects, request: { method?: string, body?: unknown }, response: ErrorBeaconResponse) => Promise<void>} Request handler.
 */
export function createErrorBeaconHandler({
  environment,
  buildVersion,
  reportEvent,
  getServerTimestamp,
  respondJson,
  respondText,
  respondEmpty,
  logError,
  console: consoleLike,
}) {
  assertFunction(reportEvent, 'reportEvent');
  assertFunction(getServerTimestamp, 'getServerTimestamp');

  return async function handleErrorBeacon(allowEffects, request, response) {
    if (!isPostRequest(request)) {
      sendMethodNotAllowed(allowEffects, response, respondText);
      return;
    }

    if (!isErrorBeaconPayload(request.body)) {
      sendBadPayload(allowEffects, response, respondJson);
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
      respondEmpty(allowEffects, response, 204);
    } catch (error) {
      reportForwardingFailure(allowEffects, logError, consoleLike, error);
      sendForwardingFailure(allowEffects, response, error, respondJson);
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
 * @param {AllowEffects} allowEffects Permission for the response write.
 * @param {ErrorBeaconResponse} response Response object.
 * @param {ErrorBeaconTextResponder} respondText Permission-aware text response adapter.
 */
function sendMethodNotAllowed(allowEffects, response, respondText) {
  respondText(allowEffects, response, 405, 'POST only');
}

/**
 * Send a 400 response for malformed payloads.
 * @param {AllowEffects} allowEffects Permission for the response write.
 * @param {ErrorBeaconResponse} response Response object.
 * @param {ErrorBeaconJsonResponder} respondJson Permission-aware JSON response adapter.
 */
function sendBadPayload(allowEffects, response, respondJson) {
  respondJson(allowEffects, response, 400, {
    error: 'Expected JSON object payload',
  });
}

/**
 * Send a 500 response for forwarding failures.
 * @param {AllowEffects} allowEffects Permission for the response write.
 * @param {ErrorBeaconResponse} response Response object.
 * @param {unknown} error Forwarding error.
 * @param {ErrorBeaconJsonResponder} respondJson Permission-aware JSON response adapter.
 */
function sendForwardingFailure(allowEffects, response, error, respondJson) {
  respondJson(allowEffects, response, 500, {
    error: resolveErrorMessage(error),
  });
}

/**
 * Log a collector failure without leaking the browser payload.
 * @param {AllowEffects} allowEffects Permission for the log write.
 * @param {ErrorBeaconErrorLogger} logError Permission-aware logging adapter.
 * @param {ErrorLogger | undefined} consoleLike Logger.
 * @param {unknown} error Forwarding error.
 */
function reportForwardingFailure(allowEffects, logError, consoleLike, error) {
  logError(
    allowEffects,
    consoleLike,
    'Error Reporting API forwarding failed',
    error
  );
}

/**
 * Resolve a readable forwarding error message.
 * @param {unknown} error Forwarding error.
 * @returns {string} Human-readable message.
 */
function resolveErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown server error';
}
