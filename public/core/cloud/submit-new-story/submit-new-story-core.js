import { assertFunction } from './cloud-core.js';

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
 * Normalize an incoming HTTP method to its uppercase representation.
 * @param {unknown} method - Incoming HTTP method value.
 * @returns {string} Uppercase HTTP method or an empty string when invalid.
 */
function normalizeMethod(method) {
  if (typeof method !== 'string') {
    return '';
  }

  return method.toUpperCase();
}

/**
 * Convert a header candidate into a normalized string value.
 * @param {unknown} candidate - Raw header candidate.
 * @returns {string | null} Normalized string when available.
 */
function normalizeAuthorizationCandidate(candidate) {
  if (typeof candidate === 'string') {
    return candidate;
  }

  if (Array.isArray(candidate)) {
    const [first] = candidate;

    return typeof first === 'string' ? first : null;
  }

  return null;
}

/**
 * Retrieve the Authorization header using an Express-style getter.
 * @param {SubmitNewStoryRequest | undefined} request - Express or plain-object request instance.
 * @returns {string | null} Header value when available.
 */
function readAuthorizationFromGetter(request) {
  const getter = request?.get;
  if (typeof getter !== 'function') {
    return null;
  }

  const uppercase = normalizeAuthorizationCandidate(getter('Authorization'));
  if (uppercase) {
    return uppercase;
  }

  return normalizeAuthorizationCandidate(getter('authorization'));
}

/**
 * Read the Authorization header from a headers bag.
 * @param {SubmitNewStoryRequest['headers']} headers - Raw headers map.
 * @returns {string | null} Header value when present.
 */
function readAuthorizationFromHeadersBag(headers) {
  if (!headers || typeof headers !== 'object') {
    return null;
  }

  const lowercase = normalizeAuthorizationCandidate(headers.authorization);
  if (lowercase) {
    return lowercase;
  }

  return normalizeAuthorizationCandidate(headers.Authorization);
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

  return readAuthorizationFromHeadersBag(request?.headers);
}

/**
 * Extract a bearer token from an Authorization header.
 * @param {unknown} header - Authorization header value.
 * @returns {string | null} Bearer token value when present.
 */
function extractBearerToken(header) {
  if (typeof header !== 'string') {
    return null;
  }

  const match = header.match(/^Bearer (.+)$/);

  return match ? match[1] : null;
}

/**
 * Normalize a textual input into a trimmed string bounded by the provided length.
 * @param {unknown} value - Raw value supplied by the client.
 * @param {number} maxLength - Maximum number of characters allowed in the normalized result.
 * @returns {string} Normalized string respecting the requested length.
 */
function normalizeString(value, maxLength) {
  if (typeof value !== 'string') {
    value = value === undefined || value === null ? '' : String(value);
  }

  return value.trim().slice(0, maxLength);
}

/**
 * Normalize content by coercing to string, harmonizing newlines, and truncating.
 * @param {unknown} value - Submitted content value.
 * @param {number} maxLength - Maximum number of characters allowed.
 * @returns {string} Content ready for persistence.
 */
function normalizeContent(value, maxLength) {
  const normalized = typeof value === 'string' ? value : String(value ?? '');

  return normalized.replace(/\r\n?/g, '\n').slice(0, maxLength);
}

/**
 * Gather optional poll choices from the incoming request body.
 * @param {Record<string, unknown> | undefined} body - Request body containing poll options.
 * @param {number} maxLength - Maximum number of characters per option.
 * @returns {string[]} Normalized non-empty poll options.
 */
function collectOptions(body, maxLength) {
  const options = [];

  for (let index = 0; index < 4; index += 1) {
    const key = `option${index}`;
    const raw = body?.[key];

    if (raw === undefined || raw === null) {
      continue;
    }

    const value = normalizeString(raw, maxLength);

    if (value) {
      options.push(value);
    }
  }

  return options;
}

/**
 * Resolve the authenticated author identifier from a request and verification function.
 * @param {SubmitNewStoryRequest | undefined} request - Request potentially carrying an identity token.
 * @param {SubmitNewStoryDependencies['verifyIdToken']} verifyIdToken - Token verification dependency.
 * @returns {Promise<string | null>} Resolved author identifier when verification succeeds.
 */
async function resolveAuthorId(request, verifyIdToken) {
  const header = getAuthorizationHeader(request);
  const token = extractBearerToken(header);

  if (!token) {
    return null;
  }

  try {
    const decoded = await verifyIdToken(token);

    if (decoded && typeof decoded.uid === 'string' && decoded.uid) {
      return decoded.uid;
    }
  } catch {
    // ignore invalid tokens
  }

  return null;
}

/**
 * Create a minimal HTTP response envelope.
 * @param {number} status - HTTP status code to emit.
 * @param {unknown} body - Response body payload.
 * @returns {HttpResponse} HTTP response envelope.
 */
function createResponse(status, body) {
  return { status, body };
}

/**
 * Build CORS configuration for the submit-new-story endpoint.
 * @param {object} config - CORS configuration values.
 * @param {string[]} [config.allowedOrigins] - Whitelisted origins permitted to access the endpoint.
 * @param {string[]} [config.methods] - Allowed HTTP methods for the route. Defaults to ['POST'].
 * @returns {{ origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void, methods: string[] }} Express-compatible CORS options.
 */
export function createCorsOptions({ allowedOrigins, methods = ['POST'] }) {
  const origins = Array.isArray(allowedOrigins) ? allowedOrigins : [];

  return {
    origin: (origin, cb) => {
      if (!origin || origins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('CORS'));
      }
    },
    methods,
  };
}

/**
 * Produce an Express error handler that converts CORS denials into structured responses.
 * @param {object} [options] - Overrides for the generated error handler. Defaults to an object emitting a 403 response.
 * @param {number} [options.status] - Status code to use when the origin is rejected. Defaults to 403.
 * @param {unknown} [options.body] - JSON payload sent on origin rejection. Defaults to { error: 'Origin not allowed' }.
 * @returns {(err: unknown, req: object, res: { status: (code: number) => { json: (payload: unknown) => void } }, next: (error?: unknown) => void) => void} Express-style error middleware.
 */
export function createCorsErrorHandler({
  status = 403,
  body = { error: 'Origin not allowed' },
} = {}) {
  return function corsErrorHandler(err, req, res, next) {
    if (err instanceof Error && err.message === 'CORS') {
      res.status(status).json(body);
      return;
    }

    next(err);
  };
}

/**
 * Adapt a domain responder into an Express request handler.
 * @param {(request: SubmitNewStoryRequest) => Promise<HttpResponse>} responder - Domain-specific request handler.
 * @returns {(req: SubmitNewStoryRequest, res: { status: (code: number) => { json: (payload: unknown) => void, send: (payload: unknown) => void, sendStatus: (code: number) => void } }) => Promise<void>} Express-compatible route handler.
 */
export function createHandleSubmitNewStory(responder) {
  assertFunction(responder, 'responder');

  return async function handleSubmitNewStory(req, res) {
    const result = await responder({
      method: req?.method,
      body: req?.body,
      get: typeof req?.get === 'function' ? name => req.get(name) : undefined,
      headers: req?.headers,
    });

    const { status, body } = result;

    if (typeof body === 'object' && body !== null) {
      res.status(status).json(body);
      return;
    }

    if (typeof body === 'undefined') {
      res.sendStatus(status);
      return;
    }

    res.status(status).send(body);
  };
}

/**
 * Construct the submit-new-story domain responder with the required dependencies.
 * @param {SubmitNewStoryDependencies} dependencies - Injectable services used by the responder.
 * @returns {(request?: SubmitNewStoryRequest) => Promise<HttpResponse>} Domain responder for new story submissions.
 */
export function createSubmitNewStoryResponder({
  verifyIdToken,
  saveSubmission,
  randomUUID,
  getServerTimestamp,
}) {
  assertFunction(verifyIdToken, 'verifyIdToken');
  assertFunction(saveSubmission, 'saveSubmission');
  assertFunction(randomUUID, 'randomUUID');
  assertFunction(getServerTimestamp, 'getServerTimestamp');

  return async function submitNewStoryResponder(request = {}) {
    if (normalizeMethod(request.method) !== 'POST') {
      return METHOD_NOT_ALLOWED_RESPONSE;
    }

    const body = request?.body ?? {};
    const title = normalizeString(body.title ?? 'Untitled', 120);
    const content = normalizeContent(body.content ?? '', 10_000);
    const author = normalizeString(body.author ?? '???', 120);
    const options = collectOptions(body, 120);
    const authorId = await resolveAuthorId(request, verifyIdToken);

    const id = randomUUID();
    await saveSubmission(id, {
      title,
      content,
      author,
      authorId,
      options,
      createdAt: getServerTimestamp(),
    });

    return createResponse(201, {
      id,
      title,
      content,
      author,
      options,
    });
  };
}
