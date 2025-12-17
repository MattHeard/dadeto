import { normalizeShortString } from './cloud-core.js';
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
 * Guard for object payloads so the response handler can treat them as JSON.
 * @param {unknown} value Candidate payload to evaluate.
 * @returns {value is Record<string, unknown>} True when the value is a non-null object.
 */
function isObjectBody(value) {
  return typeof value === 'object' && value !== null;
}

/**
 * Send an HTTP response based on the responder result payload.
 * @param {NativeHttpResponse} res - Response instance used to send data.
 * @param {number} status - HTTP status code emitted to the client.
 * @param {unknown} body - Payload returned by the domain responder.
 */
export function sendResponderResult(res, status, body) {
  if (isObjectBody(body)) {
    /** @type {Record<string, unknown>} */
    const objectBody = body;
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
