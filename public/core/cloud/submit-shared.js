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
 * @property {(res: import('express').Response, status: number, body: unknown) => void} object Handler for JSON responses.
 * @property {(res: import('express').Response, status: number) => void} undefined Handler used when the responder returns undefined.
 * @property {(res: import('express').Response, status: number, body: unknown) => void} default Handler for primitive payloads.
 */

const responderHandlers = {
  object(res, status, body) {
    res.status(status).json(body);
  },
  undefined(res, status) {
    res.sendStatus(status);
  },
  default(res, status, body) {
    res.status(status).send(body);
  },
};

const responderKeyByType = {
  true: 'undefined',
  false: 'default',
};

const isObjectBody = value => typeof value === 'object' && value !== null;

/**
 * Send an HTTP response based on the responder result payload.
 * @param {import('express').Response} res - Response instance used to send data.
 * @param {number} status - HTTP status code emitted to the client.
 * @param {unknown} body - Payload returned by the domain responder.
 */
export function sendResponderResult(res, status, body) {
  if (isObjectBody(body)) {
    responderHandlers.object(res, status, body);
    return;
  }

  const handlerKey = responderKeyByType[body === undefined];
  responderHandlers[handlerKey](res, status, body);
}

/**
 * Build an Express-compatible handler that normalizes the request and writes the responder output.
 * @param {(request: unknown) => Promise<{ status: number, body?: unknown }>} responder Function that accepts the normalized request payload and returns a response result.
 * @param {(request: import('express').Request | undefined) => unknown} normalizeRequest Request normalizer helper.
 * @returns {(req: import('express').Request | undefined, res: import('express').Response) => Promise<void>} Express handler.
 */
export function createResponderHandler(responder, normalizeRequest) {
  return async function handleResponder(req, res) {
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
