import { normalizeShortString } from './cloud-core.js';
import { resolveAuthorIdFromHeader } from './auth-helpers.js';
import { assertFunction } from './common-core.js';
import { normalizeExpressRequest } from './request-normalization.js';

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
 * @property {(res: import('express').Response, status: number, body: Record<string, unknown>) => void} object Handler for JSON responses.
 * @property {(res: import('express').Response, status: number) => void} undefined Handler used when the responder returns undefined.
 * @property {(res: import('express').Response, status: number, body: unknown) => void} default Handler for primitive payloads.
 */

/** @type {ResponderHandlers} */
const responderHandlers = {
  /**
   * JSON response handler.
   * @param {import('express').Response} res
   * @param {number} status
   * @param {Record<string, unknown>} body
   */
  object(res, status, body) {
    res.status(status).json(body);
  },
  /**
   * Handler used when the responder returns `undefined`.
   * @param {import('express').Response} res
   * @param {number} status
   */
  undefined(res, status) {
    res.sendStatus(status);
  },
  /**
   * Primitive payload handler.
   * @param {import('express').Response} res
   * @param {number} status
   * @param {unknown} body
   */
  default(res, status, body) {
    res.status(status).send(body);
  },
};

/**
 * Map the result payload type to the correct responder key.
 * @param {boolean} isUndefined
 * @returns {'undefined' | 'default'}
 */
function responderKeyByType(isUndefined) {
  return isUndefined ? 'undefined' : 'default';
}

/**
 * Guard for object payloads so the response handler can treat them as JSON.
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isObjectBody(value) {
  return typeof value === 'object' && value !== null;
}

/**
 * Send an HTTP response based on the responder result payload.
 * @param {import('express').Response} res - Response instance used to send data.
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
 * @param {(request: import('express').Request | undefined) => unknown} normalizeRequest Request normalizer helper.
 * @returns {(req: import('express').Request | undefined, res: import('express').Response) => Promise<void>} Express handler.
 */
export function createResponderHandler(responder, normalizeRequest) {
  return async function handleResponder(
    /** @type {import('express').Request | undefined} */ req,
    /** @type {import('express').Response} */ res
  ) {
    const request = normalizeRequest(req);
    const result = await responder(request);

    sendResponderResult(res, result.status, result.body);
  };
}

/**
 * Wrap a responder with the shared Express handler logic.
 * @param {(request: unknown) => Promise<{ status: number, body?: unknown }>} responder Domain response handler.
 * @returns {(req: import('express').Request | undefined, res: import('express').Response) => Promise<void>} Express handler.
 */
export function createCloudSubmitHandler(responder) {
  assertFunction(responder, 'responder');

  return createResponderHandler(responder, normalizeExpressRequest);
}

export {
  normalizeShortSubmissionString as normalizeShortString,
  resolveAuthorIdFromHeader,
};
