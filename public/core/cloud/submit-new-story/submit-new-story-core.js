import { assertFunction } from './common-core.js';
import {
  normalizeAuthor,
  normalizeSubmissionContent,
  normalizeString,
  normalizeMethod,
  normalizeAuthorizationCandidate,
  tryGetHeader,
  whenBodyPresent,
  isAllowedOrigin,
  createCorsOriginHandler,
  createResponse,
  assertFunctionDependencies,
  assertRandomUuidAndTimestamp,
  normalizeShortString,
} from './cloud-core.js';
import { resolveAuthorIdFromHeader } from '../auth-helpers.js';

/**
 * @typedef {object} SubmitNewStoryRequest
 * @property {string} [method] - HTTP method supplied by the caller.
 * @property {Record<string, unknown>} [body] - Parsed request payload when available.
 * @property {(name: string) => string | undefined} [get] - Express-style header accessor.
 * @property {Record<string, string | string[]>} [headers] - Raw header bag for non-Express environments.
 */

/**
 * @typedef {object} SubmissionRecord
 * @property {string} title - Submitted story title.
 * @property {string} content - Story content body.
 * @property {string} author - Display author name supplied by the client.
 * @property {string | null} authorId - Authenticated user identifier when available.
 * @property {string[]} options - Optional poll choices included with the story.
 * @property {unknown} createdAt - Timestamp describing when the submission was received.
 */

/**
 * @typedef {{ status: number, body?: unknown }} HttpResponse
 */

/**
 * @typedef {object} SubmitNewStoryDependencies
 * @property {(token: string) => Promise<{ uid?: string | undefined }>} verifyIdToken - Validates an identity token and returns decoded claims.
 * @property {(id: string, submission: SubmissionRecord) => Promise<void>} saveSubmission - Persists a submission under the provided identifier.
 * @property {() => string} randomUUID - Generates a unique identifier for a submission.
 * @property {() => unknown} getServerTimestamp - Supplies a server-side timestamp representation.
 */

/**
 * Standard response returned when a non-POST request is received.
 * @type {HttpResponse}
 */
const METHOD_NOT_ALLOWED_RESPONSE = { status: 405, body: 'POST only' };

/**
 * Get getter function from request.
 * @param {SubmitNewStoryRequest} request Request.
 * @returns {Function | undefined} Getter.
 */
function getRequestGetter(request) {
  return request?.get;
}

/**
 * Get auth header from getter.
 * @param {Function} getter Getter.
 * @returns {string | null} Auth header.
 */
function getAuthFromGetter(getter) {
  const uppercase = tryGetHeader(getter, 'Authorization');
  if (uppercase) {
    return uppercase;
  }
  return tryGetHeader(getter, 'authorization');
}

/**
 * Retrieve the Authorization header using an Express-style getter.
 * @param {SubmitNewStoryRequest | undefined} request - Express or plain-object request instance.
 * @returns {string | null} Header value when available.
 */
function readAuthorizationFromGetter(request) {
  const getter = getRequestGetter(request);
  if (typeof getter !== 'function') {
    return null;
  }
  return getAuthFromGetter(getter);
}

/**
 * Check if headers object is valid.
 * @param {unknown} headers Headers.
 * @returns {boolean} True if valid.
 */
function isValidHeaders(headers) {
  return Boolean(headers) && typeof headers === 'object';
}

/**
 * Validate headers object.
 * @param {unknown} headers Headers.
 * @returns {Record<string, unknown> | null} Headers or null.
 */
function validateHeaders(headers) {
  if (isValidHeaders(headers)) {
    return headers;
  }
  return null;
}

/**
 * Find authorization header in headers object.
 * @param {Record<string, unknown>} headers Headers.
 * @returns {string | null} Auth header.
 */
function findAuthInHeaders(headers) {
  const lowercase = normalizeAuthorizationCandidate(headers.authorization);
  if (lowercase) {
    return lowercase;
  }
  return normalizeAuthorizationCandidate(headers.Authorization);
}

/**
 * Read the Authorization header from a headers bag.
 * @param {SubmitNewStoryRequest['headers']} headers - Raw headers map.
 * @returns {string | null} Header value when present.
 */
function readAuthorizationFromHeadersBag(headers) {
  const validHeaders = validateHeaders(headers);
  if (!validHeaders) {
    return null;
  }
  return findAuthInHeaders(validHeaders);
}

/**
 * Get headers bag from request.
 * @param {SubmitNewStoryRequest | undefined} request Request.
 * @returns {SubmitNewStoryRequest['headers']} Headers.
 */
function getHeadersBag(request) {
  if (!request) {
    return undefined;
  }
  return request.headers;
}

/**
 * Retrieve the Authorization header from an incoming request object.
 * @param {SubmitNewStoryRequest | undefined} request - Express or plain-object request instance.
 * @returns {string | null} Header value when available.
 */
function getAuthorizationHeader(request) {
  const getterHeader = readAuthorizationFromGetter(request);
  if (getterHeader) {
    return getterHeader;
  }

  return readAuthorizationFromHeadersBag(getHeadersBag(request));
}

/**
 * Get raw option.
 * @param {Record<string, unknown>} body Body.
 * @param {string} key Key.
 * @returns {unknown} Raw value.
 */
function getRawOption(body, key) {
  return body?.[key];
}

/**
 * Check if raw option is present.
 * @param {unknown} raw Raw option.
 * @returns {boolean} True if present.
 */
function isOptionPresent(raw) {
  return raw !== null && raw !== undefined;
}

/**
 * Process a single option candidate.
 * @param {Record<string, unknown>} body - Request body.
 * @param {number} index - Option index.
 * @param {number} maxLength - Max length.
 * @returns {string | null} Normalized option or null.
 */
function processOption(body, index, maxLength) {
  const key = `option${index}`;
  const raw = getRawOption(body, key);

  if (!isOptionPresent(raw)) {
    return null;
  }

  return normalizeString(raw, maxLength);
}

/**
 * Gather optional poll choices from the incoming request body.
 * @param {Record<string, unknown> | undefined} body - Request body containing poll options.
 * @param {number} maxLength - Maximum number of characters per option.
 * @returns {string[]} Normalized non-empty poll options.
 */
function collectOptions(body, maxLength) {
  return [0, 1, 2, 3]
    .map(index => processOption(body, index, maxLength))
    .filter(Boolean);
}

/**
 * Check if UID is valid string.
 * @param {unknown} uid UID.
 * @returns {boolean} True if valid.
 */
function isValidUid(uid) {
  return typeof uid === 'string' && uid !== '';
}

/**
 * Get valid UID.
 * @param {unknown} uid UID.
 * @returns {string | null} UID or null.
 */
function getValidUid(uid) {
  if (isValidUid(uid)) {
    return uid;
  }
  return null;
}

/**
 * Validate decoded token.
 * @param {object} decoded Decoded token.
 * @returns {string | null} UID or null.
 */
function validateDecodedToken(decoded) {
  if (!decoded) {
    return null;
  }
  return getValidUid(decoded.uid);
}

/**
 * Resolve the authenticated author identifier from a request and verification function.
 * @param {SubmitNewStoryRequest | undefined} request - Request potentially carrying an identity token.
 * @param {SubmitNewStoryDependencies['verifyIdToken']} verifyIdToken - Token verification dependency.
 * @returns {Promise<string | null>} Resolved author identifier when verification succeeds.
 */
export function resolveAuthorId(request, verifyIdToken) {
  const header = getAuthorizationHeader(request);
  return resolveAuthorIdFromHeader(header, verifyIdToken, validateDecodedToken);
}

/**
 * Get allowed origins from options.
 * @param {object} options Options.
 * @returns {string[]} Allowed origins.
 */
function getAllowedOrigins(options) {
  if (Array.isArray(options.allowedOrigins)) {
    return options.allowedOrigins;
  }
  return [];
}

/**
 * Get methods from options.
 * @param {object} options Options.
 * @returns {string[]} Methods.
 */
function getMethods(options) {
  return options.methods || ['POST'];
}

/**
 * Normalize CORS options.
 * @param {object} options Options.
 * @returns {{ allowedOrigins: string[], methods: string[] }} Normalized options.
 */
export function normalizeCorsOptions(options) {
  const opts = options || {};
  return {
    allowedOrigins: getAllowedOrigins(opts),
    methods: getMethods(opts),
  };
}

/**
 * Build CORS configuration for the submit-new-story endpoint.
 * @param {object} config - CORS configuration values.
 * @param {string[]} [config.allowedOrigins] - Whitelisted origins permitted to access the endpoint.
 * @param {string[]} [config.methods] - Allowed HTTP methods for the route. Defaults to ['POST'].
 * @returns {{ origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void, methods: string[] }} Express-compatible CORS options.
 */
export function createCorsOptions(config) {
  const { allowedOrigins, methods } = normalizeCorsOptions(config);

  return {
    origin: createCorsOriginHandler(isAllowedOrigin, allowedOrigins),
    methods,
  };
}

/**
 * Check if the error is a CORS error.
 * @param {unknown} err Error object.
 * @returns {boolean} True if CORS error.
 */
function isCorsError(err) {
  return err instanceof Error && err.message === 'CORS';
}

/**
 * Handle CORS error response.
 * @param {object} res Response object.
 * @param {number} status Status code.
 * @param {unknown} body Response body.
 */
function sendCorsError(res, status, body) {
  res.status(status).json(body);
}

/**
 * Get status from options.
 * @param {object} options Options.
 * @returns {number} Status.
 */
function getStatus(options) {
  return options.status || 403;
}

/**
 * Get body from options.
 * @param {object} options Options.
 * @returns {unknown} Body.
 */
function getBody(options) {
  return options.body || { error: 'Origin not allowed' };
}

/**
 * Normalize CORS error handler options.
 * @param {object} options Options.
 * @returns {{ status: number, body: unknown }} Normalized options.
 */
function normalizeCorsErrorHandlerOptions(options) {
  const opts = options || {};
  return {
    status: getStatus(opts),
    body: getBody(opts),
  };
}

/**
 * Produce an Express error handler that converts CORS denials into structured responses.
 * @param {object} [options] - Overrides for the generated error handler. Defaults to an object emitting a 403 response.
 * @param {number} [options.status] - Status code to use when the origin is rejected. Defaults to 403.
 * @param {unknown} [options.body] - JSON payload sent on origin rejection. Defaults to { error: 'Origin not allowed' }.
 * @returns {(err: unknown, req: object, res: { status: (code: number) => { json: (payload: unknown) => void } }, next: (error?: unknown) => void) => void} Express-style error middleware.
 */
export function createCorsErrorHandler(options) {
  const normalized = normalizeCorsErrorHandlerOptions(options);

  return function corsErrorHandler(...args) {
    const [err, , res, next] = args;
    if (isCorsError(err)) {
      sendCorsError(res, normalized.status, normalized.body);
      return;
    }
    next(err);
  };
}

/**
 * Resolve the header getter from an Express request when available.
 * @param {SubmitNewStoryRequest} req - Incoming Express request.
 * @returns {SubmitNewStoryRequest['get']} Header getter.
 */
function resolveRequestGetter(req) {
  if (typeof req.get !== 'function') {
    return undefined;
  }

  return name => req.get(name);
}

/**
 * Normalize an Express request into the shape expected by the responder.
 * @param {SubmitNewStoryRequest} req - Incoming Express request.
 * @returns {SubmitNewStoryRequest} Request data for the responder.
 */
function mapSubmitNewStoryRequest(req) {
  const request = req ?? {};

  return {
    method: request.method,
    body: request.body,
    get: resolveRequestGetter(request),
    headers: request.headers,
  };
}

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

/**
 * Determine whether a responder body should be serialized as JSON.
 * @param {unknown} body - Response body candidate.
 * @returns {body is Record<string, unknown>} Whether the body is a JSON object.
 */
function isObjectBody(body) {
  return whenBodyPresent(body, candidate => typeof candidate === 'object');
}

/**
 * Send an HTTP response based on the responder result payload.
 * @param {import('express').Response} res - Response instance used to send data.
 * @param {number} status - HTTP status code emitted to the client.
 * @param {unknown} body - Payload returned by the domain responder.
 */
function sendResponderResult(res, status, body) {
  if (isObjectBody(body)) {
    responderHandlers.object(res, status, body);
    return;
  }

  const handlerKey = responderKeyByType[body === undefined];
  responderHandlers[handlerKey](res, status, body);
}

/**
 * Adapt a domain responder into an Express request handler.
 * @param {(request: SubmitNewStoryRequest) => Promise<HttpResponse>} responder - Domain-specific request handler.
 * @returns {(req: SubmitNewStoryRequest, res: { status: (code: number) => { json: (payload: unknown) => void, send: (payload: unknown) => void, sendStatus: (code: number) => void } }) => Promise<void>} Express-compatible route handler.
 */
export function createHandleSubmitNewStory(responder) {
  assertFunction(responder, 'responder');

  return async function handleSubmitNewStory(req, res) {
    const request = mapSubmitNewStoryRequest(req);
    const result = await responder(request);

    sendResponderResult(res, result.status, result.body);
  };
}

/**
 * Normalize title.
 * @param {string} title Raw title.
 * @returns {string} Normalized title.
 */
function normalizeTitle(title) {
  return normalizeShortString(title ?? 'Untitled');
}

/**
 * Normalize content.
 * @param {string} content Raw content.
 * @returns {string} Normalized content.
 */
/**
 * Normalize submission data from request body.
 * @param {Record<string, unknown>} body - Request body.
 * @returns {object} Normalized data.
 */
function normalizeSubmissionData(body) {
  const title = normalizeTitle(body.title);
  const content = normalizeSubmissionContent(body.content);
  const author = normalizeAuthor(body.author ?? '???');
  const options = collectOptions(body, 120);

  return { title, content, author, options };
}

/**
 * Validate request method.
 * @param {string} method Request method.
 * @returns {boolean} True if POST.
 */
function isPostMethod(method) {
  return normalizeMethod(method) === 'POST';
}

/**
 * Save the submission.
 * @param {object} deps Dependencies.
 * @param {string} id ID.
 * @param {object} data Data.
 * @returns {Promise<void>} Promise.
 */
async function saveNewStory(deps, id, data) {
  const { saveSubmission, getServerTimestamp } = deps;
  await saveSubmission(id, {
    ...data,
    createdAt: getServerTimestamp(),
  });
}

/**
 * Extract body from request.
 * @param {Record<string, unknown>} req Request.
 * @returns {Record<string, unknown>} Body.
 */
function extractBody(req) {
  return req.body || {};
}

/**
 * Get request body.
 * @param {SubmitNewStoryRequest} request Request.
 * @returns {Record<string, unknown>} Body.
 */
export function getRequestBody(request) {
  const req = request || {};
  return extractBody(req);
}

/**
 * Process the submission request.
 * @param {SubmitNewStoryDependencies} deps Dependencies.
 * @param {SubmitNewStoryRequest} request Request.
 * @returns {Promise<HttpResponse>} Response.
 */
async function processSubmission(deps, request) {
  const { verifyIdToken, randomUUID } = deps;
  const body = getRequestBody(request);
  const data = normalizeSubmissionData(body);
  const authorId = await resolveAuthorId(request, verifyIdToken);

  const id = randomUUID();
  await saveNewStory(deps, id, { ...data, authorId });

  return createResponse(201, {
    id,
    ...data,
  });
}

/**
 * Construct the submit-new-story domain responder with the required dependencies.
 * @param {SubmitNewStoryDependencies} dependencies - Injectable services used by the responder.
 * @returns {(request?: SubmitNewStoryRequest) => Promise<HttpResponse>} Domain responder for new story submissions.
 */
export function createSubmitNewStoryResponder(dependencies) {
  const { verifyIdToken, saveSubmission } = dependencies;

  assertFunctionDependencies([
    ['verifyIdToken', verifyIdToken],
    ['saveSubmission', saveSubmission],
  ]);

  assertRandomUuidAndTimestamp(dependencies);

  return async function submitNewStoryResponder(request) {
    if (!isPostMethod(request.method)) {
      return METHOD_NOT_ALLOWED_RESPONSE;
    }

    return processSubmission(dependencies, request);
  };
}
