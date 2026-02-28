import {
  normalizeShortString,
  isObject,
  normalizeAuthorizationCandidate,
  tryGetHeader,
} from './cloud-core.js';
import { resolveAuthorIdFromHeader } from './auth-helpers.js';
import { assertFunction } from './common-core.js';
import { normalizeExpressRequest } from './request-normalization.js';

/** @typedef {import('../../../types/native-http').NativeHttpRequest} NativeHttpRequest */
/** @typedef {import('../../../types/native-http').NativeHttpResponse} NativeHttpResponse */

/**
 * Normalize the short text submitted by callers (title, option, page markers, etc.).
 * @param {unknown} value Candidate value supplied by the request.
 * @returns {string} Trimmed string limited to the short-field length.
 */
function normalizeShortSubmissionString(value) {
  return normalizeShortString(value);
}

/**
 * Determine whether a raw option candidate is present.
 * @param {unknown} option Candidate option value from the request body.
 * @returns {boolean} True when the option was provided.
 */
function hasOptionValue(option) {
  return option !== undefined && option !== null;
}

/**
 * Normalize a single numbered option from a submission body.
 * @param {Record<string, unknown>} body Request body containing `optionN` fields.
 * @param {number} index Option index to extract.
 * @param {number} maxLength Maximum length applied during normalization.
 * @returns {string | null} Normalized option string or null when absent.
 */
function normalizeSubmissionOption(body, index, maxLength) {
  const raw = body[`option${index}`];
  if (!hasOptionValue(raw)) {
    return null;
  }

  return normalizeShortString(raw).slice(0, maxLength);
}

/**
 * Collect normalized numbered options from a submission payload.
 * @param {Record<string, unknown> | undefined} body Request body containing optional `option0`-`option3` fields.
 * @param {number} maxLength Maximum length applied to each normalized option.
 * @returns {string[]} Normalized non-empty option strings.
 */
export function collectSubmissionOptions(body, maxLength) {
  const normalizedBody = body || {};
  const options = [0, 1, 2, 3]
    .map(index => normalizeSubmissionOption(normalizedBody, index, maxLength))
    .filter(Boolean);
  return /** @type {string[]} */ (options);
}

/**
 * Return the first non-empty authorization candidate.
 * @param {...(string | null)} candidates Candidate header values.
 * @returns {string | null} First non-empty value or null.
 */
function resolveAuthorizationCandidate(...candidates) {
  const found = candidates.find(Boolean);
  return found || null;
}

/**
 * Read a header via the getter when one exists.
 * @param {((name: string) => string | null | undefined) | undefined} getter Express-style header getter.
 * @param {string} name Header name to resolve.
 * @returns {string | null} Normalized header value or null.
 */
function tryReadGetterHeader(getter, name) {
  if (typeof getter !== 'function') {
    return null;
  }

  return tryGetHeader(
    headerName => {
      const value = getter(headerName);
      return value === null ? undefined : value;
    },
    name
  );
}

/**
 * Read the Authorization header from a getter function.
 * @param {((name: string) => string | null | undefined) | undefined} getter Express-style header getter.
 * @returns {string | null} Authorization header value or null when unavailable.
 */
export function getAuthorizationFromGetter(getter) {
  return resolveAuthorizationCandidate(
    tryReadGetterHeader(getter, 'Authorization'),
    tryReadGetterHeader(getter, 'authorization')
  );
}

/**
 * Normalize a raw headers object when it behaves like a plain record.
 * @param {unknown} headers Candidate headers object.
 * @returns {Record<string, unknown> | null} Normalized headers record or null.
 */
function normalizeHeadersRecord(headers) {
  if (!isObject(headers)) {
    return null;
  }

  return /** @type {Record<string, unknown>} */ (headers);
}

/**
 * Normalize a single Authorization header value from a headers record.
 * @param {Record<string, unknown> | null} headers Normalized headers record.
 * @param {'Authorization' | 'authorization'} key Header key to read.
 * @returns {string | null} Normalized header value or null.
 */
function getAuthorizationHeaderValue(headers, key) {
  return normalizeAuthorizationCandidate(headers?.[key]);
}

/**
 * Read the Authorization header from a raw headers bag.
 * @param {unknown} headers Raw headers object from the request.
 * @returns {string | null} Authorization header value or null when unavailable.
 */
export function getAuthorizationFromHeaders(headers) {
  const normalizedHeaders = normalizeHeadersRecord(headers);
  return resolveAuthorizationCandidate(
    getAuthorizationHeaderValue(normalizedHeaders, 'Authorization'),
    getAuthorizationHeaderValue(normalizedHeaders, 'authorization')
  );
}

/**
 * Read the getter function from a request-like object.
 * @param {{ get?: (name: string) => string | null | undefined } | undefined} request Request-like value.
 * @returns {((name: string) => string | null | undefined) | undefined} Header getter.
 */
function getRequestGetter(request) {
  return request && request.get;
}

/**
 * Read the headers bag from a request-like object.
 * @param {{ headers?: Record<string, unknown> | null | undefined } | undefined} request Request-like value.
 * @returns {Record<string, unknown> | null | undefined} Raw headers bag.
 */
function getRequestHeaders(request) {
  return request && request.headers;
}

/**
 * Resolve an Authorization header from a heterogeneous request shape.
 * @param {{ get?: (name: string) => string | null | undefined, headers?: Record<string, unknown> | null | undefined } | undefined} request Request-like value.
 * @returns {string | null} Authorization header value or null when unavailable.
 */
export function getAuthorizationHeader(request) {
  return resolveAuthorizationCandidate(
    getAuthorizationFromGetter(getRequestGetter(request)),
    getAuthorizationFromHeaders(getRequestHeaders(request))
  );
}

/**
 * @typedef {object} ResponderHandlers
 * @property {(res: NativeHttpResponse, status: number, body: Record<string, unknown>) => void} object Handler for JSON responses.
 * @property {(res: NativeHttpResponse, status: number) => void} undefined Handler used when the responder returns undefined.
 * @property {(res: NativeHttpResponse, status: number, body: unknown) => void} default Handler for primitive payloads.
 */

/** @type {ResponderHandlers} */
const responderHandlers = {
  /**
   * JSON response handler.
   * @param {NativeHttpResponse} res Response used to send JSON payloads.
   * @param {number} status HTTP status code to emit.
   * @param {Record<string, unknown>} body Payload to serialize as JSON.
   */
  object(res, status, body) {
    res.status(status).json(body);
  },
  /**
   * Handler used when the responder returns `undefined`.
   * @param {NativeHttpResponse} res Response for status-only replies.
   * @param {number} status HTTP status code to emit.
   */
  undefined(res, status) {
    res.sendStatus(status);
  },
  /**
   * Primitive payload handler.
   * @param {NativeHttpResponse} res Response used to write primitives.
   * @param {number} status HTTP status code to emit.
   * @param {unknown} body Payload echoed through `send`.
   */
  default(res, status, body) {
    res.status(status).send(body);
  },
};

/**
 * Map the result payload type to the correct responder key.
 * @param {boolean} isUndefined Whether the responder returned `undefined`.
 * @returns {'undefined' | 'default'} Key that selects the correct handler.
 */
function responderKeyByType(isUndefined) {
  if (isUndefined) {
    return 'undefined';
  }
  return 'default';
}

/**
 * Send an HTTP response based on the responder result payload.
 * @param {NativeHttpResponse} res - Response instance used to send data.
 * @param {number} status - HTTP status code emitted to the client.
 * @param {unknown} body - Payload returned by the domain responder.
 */
export function sendResponderResult(res, status, body) {
  if (isObject(body)) {
    const objectBody = normalizeHeadersRecord(body);
    if (!objectBody) {
      responderHandlers.default(res, status, String(body));
      return;
    }
    responderHandlers.object(res, status, objectBody);
    return;
  }

  const handlerKey = responderKeyByType(body === undefined);
  responderHandlers[handlerKey](res, status, body);
}

/**
 * Build an Express-compatible handler that normalizes the request and writes the responder output.
 * @param {(request: unknown) => Promise<{ status: number, body?: unknown }>} responder Function that accepts the normalized request payload and returns a response result.
 * @param {(request: NativeHttpRequest | undefined) => unknown} normalizeRequest Request normalizer helper.
 * @returns {(req: NativeHttpRequest | undefined, res: NativeHttpResponse) => Promise<void>} Express handler.
 */
export function createResponderHandler(responder, normalizeRequest) {
  return async function handleResponder(
    /** @type {NativeHttpRequest | undefined} */ req,
    /** @type {NativeHttpResponse} */ res
  ) {
    const request = normalizeRequest(req);
    const result = await responder(request);

    sendResponderResult(res, result.status, result.body);
  };
}

/**
 * Wrap a responder with the shared Express handler logic.
 * @param {(request: unknown) => Promise<{ status: number, body?: unknown }>} responder Domain response handler.
 * @returns {(req: NativeHttpRequest | undefined, res: NativeHttpResponse) => Promise<void>} Express handler.
 */
export function createCloudSubmitHandler(responder) {
  assertFunction(responder, 'responder');

  return createResponderHandler(responder, normalizeExpressRequest);
}

export {
  normalizeShortSubmissionString as normalizeShortString,
  resolveAuthorIdFromHeader,
};
