import { sanitizeUrl } from '../error-reporting.js';

/**
 * @typedef {(url: string, init?: { method?: string, headers?: Record<string, string>, body?: string, mode?: string, credentials?: string, keepalive?: boolean }) => Promise<unknown>} FetchFn
 * @typedef {() => string | undefined} StringGetter
 * @typedef {() => number} NowGetter
 * @typedef {(payload: Record<string, unknown>) => void} BeaconReporter
 */

/**
 * Normalize an unknown value into a readable string.
 * @param {unknown} value Value to normalize.
 * @returns {string} Normalized string.
 */
function toMessage(value) {
  const errorMessage = toErrorMessage(value);
  if (errorMessage) {
    return errorMessage;
  }

  const objectMessage = toObjectMessage(value);
  if (objectMessage) {
    return objectMessage;
  }

  return String(value);
}

/**
 * Resolve a message directly from an Error instance.
 * @param {unknown} value Candidate value.
 * @returns {string} Error-derived message or empty string.
 */
function toErrorMessage(value) {
  if (!(value instanceof Error)) {
    return '';
  }

  const { message } = value;
  if (message) {
    return message;
  }

  return value.name || 'Error';
}

/**
 * Resolve a message from an object-like value.
 * @param {unknown} value Candidate value.
 * @returns {string} Serialized object message or empty string.
 */
function toObjectMessage(value) {
  if (!value || typeof value !== 'object') {
    return '';
  }

  return serializeObjectValue(value);
}

/**
 * Serialize an object-like value with a safe fallback.
 * @param {object} value Object value to serialize.
 * @returns {string} Serialized or fallback string.
 */
function serializeObjectValue(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

/**
 * Extract a stack string from an error-like value.
 * @param {unknown} value Candidate error.
 * @returns {string} Stack string or empty string.
 */
function toStack(value) {
  if (value instanceof Error && typeof value.stack === 'string') {
    return value.stack;
  }

  if (value && typeof value === 'object') {
    const candidate = /** @type {{ stack?: unknown }} */ (value);
    if (typeof candidate.stack === 'string') {
      return candidate.stack;
    }
  }

  return '';
}

/**
 * Normalize an arbitrary exception into a browser beacon payload.
 * @param {{
 *   error: unknown,
 *   source: string,
 *   getUrl: StringGetter,
 *   getNow: NowGetter,
 * }} input Normalization inputs.
 * @returns {Record<string, unknown> | null} Normalized payload or null when unusable.
 */
export function normalizeErrorPayload(input) {
  const { error, source, getUrl, getNow } = input;
  if (error === null || error === undefined) {
    return null;
  }

  const message = toMessage(error);
  const stack = toStack(error);
  const url = getUrl();
  const dedupeKey = [message, stack, url ?? ''].join('\u0000');

  return {
    message,
    stack,
    url: sanitizeUrl(url ?? ''),
    clientTimestamp: new Date(getNow()).toISOString(),
    source,
    dedupeKey,
  };
}

/**
 * Create a best-effort beacon sender.
 * @param {FetchFn | undefined} fetchFn Fetch function.
 * @param {string} endpointUrl Beacon endpoint.
 * @returns {BeaconReporter} Beacon reporter.
 */
export function createErrorBeaconReporter(fetchFn, endpointUrl) {
  return payload => {
    if (typeof fetchFn !== 'function') {
      return;
    }

    fetchFn(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      mode: 'cors',
      credentials: 'omit',
      keepalive: true,
    }).catch(() => {});
  };
}

/**
 * Create a best-effort navigator.sendBeacon reporter.
 * @param {((url: string, data?: BodyInit | null) => boolean) | undefined} sendBeaconFn Beacon transport.
 * @param {string} endpointUrl Beacon endpoint.
 * @returns {BeaconReporter} Beacon reporter.
 */
export function createErrorBeaconSendBeaconReporter(sendBeaconFn, endpointUrl) {
  return payload => {
    if (typeof sendBeaconFn !== 'function') {
      return;
    }

    sendBeaconFn(endpointUrl, JSON.stringify(payload));
  };
}

/**
 * Create error-beacon aware console and global error handlers.
 * @param {{
 *   reportBeacon: BeaconReporter,
 *   getUrl: StringGetter,
 *   getNow: NowGetter,
 *   logError?: (...args: unknown[]) => void,
 * }} deps Dependencies.
 * @returns {{
 *   logError: (...args: unknown[]) => void,
 *   handleWindowError: (event: ErrorEvent) => void,
 *   handleUnhandledRejection: (event: PromiseRejectionEvent) => void,
 * }} Error-beacon aware handlers.
 */
export function createErrorBeaconHandlers({
  reportBeacon,
  getUrl,
  getNow,
  logError = () => {},
}) {
  const seen = new Set();

  /**
   * Record an error payload once per dedupe key.
   * @param {unknown} error Error value.
   * @param {string} source Source label.
   * @returns {void} Nothing.
   */
  function emit(error, source) {
    const payload = normalizeErrorPayload({
      error,
      source,
      getUrl,
      getNow,
    });
    if (!payload) {
      return;
    }

    const dedupeKey = String(payload.dedupeKey);
    if (seen.has(dedupeKey)) {
      return;
    }
    seen.add(dedupeKey);
    reportBeacon(payload);
  }

  return {
    logError: (...args) => {
      logError(...args);
      let payloadError = args[0];
      if (args.length > 1) {
        payloadError = args;
      }
      emit(payloadError, 'console.error');
    },
    handleWindowError: event => {
      emit(event.error ?? event.message ?? event, 'window.error');
    },
    handleUnhandledRejection: event => {
      emit(event.reason ?? event, 'unhandledrejection');
    },
  };
}
