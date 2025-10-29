const METHOD_NOT_ALLOWED_RESPONSE = { status: 405, body: 'POST only' };
const INVALID_BODY_RESPONSE = {
  status: 400,
  body: 'Missing or invalid isApproved',
};
const MISSING_AUTHORIZATION_RESPONSE = {
  status: 401,
  body: 'Missing or invalid Authorization header',
};
const NO_JOB_RESPONSE = { status: 404, body: 'No moderation job' };

/**
 * @typedef {object} SubmitModerationRatingRequest
 * @property {string | undefined} [method] HTTP method supplied by the caller.
 * @property {{ isApproved?: unknown } | null | undefined} [body] Request payload submitted by the client.
 * @property {(name: string) => string | null | undefined} [get] Optional Express-style header accessor.
 * @property {Record<string, unknown> | undefined} [headers] Raw headers object provided by the runtime.
 */

/**
 * @typedef {object} SubmitModerationRatingResponse
 * @property {number} status HTTP status code describing the outcome.
 * @property {string | Record<string, unknown>} body Payload written to the HTTP response.
 */

/**
 * @typedef {object} ModeratorAssignment
 * @property {string} variantId Identifier for the variant assigned to the moderator.
 * @property {(() => Promise<void> | void) | null} [clearAssignment] Optional callback that clears the assignment.
 */

/**
 * @typedef {object} SubmitModerationRatingDependencies
 * @property {(token: string) => Promise<{ uid?: string | null } | null | undefined>} verifyIdToken Verify and decode the auth token.
 * @property {(uid: string) => Promise<ModeratorAssignment | null | undefined>} fetchModeratorAssignment Fetch the pending assignment for a moderator.
 * @property {(rating: { id: string, moderatorId: string, variantId: string, isApproved: boolean, ratedAt: unknown }) => Promise<void> | void} recordModerationRating Persist the submitted rating.
 * @property {() => string} randomUUID Generate a unique identifier for the rating entry.
 * @property {() => unknown} getServerTimestamp Provide the timestamp stored with the rating.
 */

/**
 * Ensure a candidate dependency is a callable function.
 * @param {unknown} candidate Value being validated.
 * @param {string} name Name of the dependency for error reporting.
 * @returns {void}
 */
function assertFunction(candidate, name) {
  if (typeof candidate !== 'function') {
    throw new TypeError(`${name} must be a function`);
  }
}

/**
 * Normalize a request method to an uppercase HTTP verb.
 * @param {unknown} method Method value received from the HTTP adapter.
 * @returns {string} Uppercase HTTP verb or an empty string when missing.
 */
function normalizeMethod(method) {
  if (typeof method !== 'string') {
    return '';
  }

  return method.toUpperCase();
}

/**
 * Resolve the Authorization header from Express-like request shapes.
 * @param {SubmitModerationRatingRequest | undefined} request Request object supplied by the adapter.
 * @returns {string | null} Raw Authorization header value or null when absent.
 */
function getAuthorizationHeader(request) {
  if (request && typeof request.get === 'function') {
    const header = request.get('Authorization') ?? request.get('authorization');

    if (typeof header === 'string') {
      return header;
    }
  }

  const headers = request?.headers;
  if (headers && typeof headers === 'object') {
    const header = headers.authorization ?? headers.Authorization;

    if (Array.isArray(header)) {
      return header[0] ?? null;
    }

    if (typeof header === 'string') {
      return header;
    }
  }

  return null;
}

/**
 * Extract a bearer token from an Authorization header string.
 * @param {string | null} header Authorization header retrieved from the request.
 * @returns {string | null} Bearer token contained in the header or null when invalid.
 */
function extractBearerToken(header) {
  if (typeof header !== 'string') {
    return null;
  }

  const match = header.match(/^Bearer (.+)$/);

  return match ? match[1] : null;
}

/**
 * Create a normalized response payload for the HTTP adapter.
 * @param {number} status HTTP status code.
 * @param {string | Record<string, unknown>} body Response payload to send to the client.
 * @returns {SubmitModerationRatingResponse} Response tuple consumed by the caller.
 */
function createResponse(status, body) {
  return { status, body };
}

/**
 * Determine whether an origin is included in the allow-list.
 * @param {string | undefined} origin Origin reported by the client.
 * @param {string[]} allowedOrigins Normalized allow-list for the endpoint.
 * @returns {boolean} True when the origin may access the endpoint.
 */
function validateAllowedOrigin(origin, allowedOrigins) {
  if (!origin) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

/**
 * Create configuration consumed by the CORS middleware.
 * @param {{ allowedOrigins?: string[] | null, methods?: string[] }} root0 Options controlling CORS behavior.
 * @param {string[] | null | undefined} root0.allowedOrigins Origins that may access the endpoint.
 * @param {string[]} [root0.methods] HTTP methods supported by the endpoint. Defaults to ['POST'].
 * @returns {{ origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void, methods: string[] }} CORS configuration compatible with Express middleware.
 */
export function createCorsOptions({ allowedOrigins, methods = ['POST'] }) {
  const origins = Array.isArray(allowedOrigins) ? allowedOrigins : [];

  return {
    origin: (origin, cb) => {
      if (validateAllowedOrigin(origin, origins)) {
        cb(null, true);
      } else {
        cb(new Error('CORS'));
      }
    },
    methods,
  };
}

/**
 * Wrap the domain responder in an Express-style HTTP handler.
 * @param {(request: SubmitModerationRatingRequest) => Promise<SubmitModerationRatingResponse>} responder Domain-specific responder that returns status/body pairs.
 * @returns {(req: SubmitModerationRatingRequest, res: { status: (code: number) => { json: (body: Record<string, unknown>) => void, send: (body: string) => void }, sendStatus: (code: number) => void }) => Promise<void>} Express-compatible handler that writes the responder output.
 */
export function createHandleSubmitModerationRating(responder) {
  assertFunction(responder, 'responder');

  return async function handleSubmitModerationRating(req, res) {
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
 * Determine whether a value is a boolean literal.
 * @param {unknown} value Candidate value to evaluate.
 * @returns {value is boolean} True when the value is a boolean.
 */
function ensureBoolean(value) {
  return typeof value === 'boolean';
}

/**
 * Resolve a user ID from an ID token.
 * @param {SubmitModerationRatingDependencies['verifyIdToken']} verifyIdToken Function that verifies the token.
 * @param {string} token Bearer token extracted from the request.
 * @returns {Promise<string>} UID contained in the decoded token.
 * @throws {Error} When the token is invalid or expired.
 */
async function resolveUid(verifyIdToken, token) {
  try {
    const decoded = await verifyIdToken(token);

    if (decoded && typeof decoded.uid === 'string' && decoded.uid) {
      return decoded.uid;
    }
  } catch (err) {
    const message = err?.message || 'Invalid or expired token';
    throw Object.assign(new Error(message), { code: 'invalid-token' });
  }

  throw Object.assign(new Error('Invalid or expired token'), {
    code: 'invalid-token',
  });
}

/**
 * Normalize the moderator assignment into a predictable shape.
 * @param {SubmitModerationRatingDependencies['fetchModeratorAssignment']} fetchModeratorAssignment Dependency that fetches the assignment.
 * @param {string} uid Identifier of the moderator.
 * @returns {Promise<ModeratorAssignment | null>} Assignment details or null when none exists.
 */
async function resolveModeratorAssignment(fetchModeratorAssignment, uid) {
  const assignment = await fetchModeratorAssignment(uid);

  if (!assignment) {
    return null;
  }

  const { variantId } = assignment;

  if (typeof variantId !== 'string' || variantId.length === 0) {
    return null;
  }

  const clearAssignment = assignment.clearAssignment;

  return {
    variantId,
    clearAssignment: typeof clearAssignment === 'function' ? clearAssignment : null,
  };
}

/**
 * Build the domain responder that processes moderation rating submissions.
 * @param {SubmitModerationRatingDependencies} dependencies Functions required to process the request.
 * @returns {(request?: SubmitModerationRatingRequest) => Promise<SubmitModerationRatingResponse>} Responder that validates and processes submissions.
 */
export function createSubmitModerationRatingResponder({
  verifyIdToken,
  fetchModeratorAssignment,
  recordModerationRating,
  randomUUID,
  getServerTimestamp,
}) {
  assertFunction(verifyIdToken, 'verifyIdToken');
  assertFunction(fetchModeratorAssignment, 'fetchModeratorAssignment');
  assertFunction(recordModerationRating, 'recordModerationRating');
  assertFunction(randomUUID, 'randomUUID');
  assertFunction(getServerTimestamp, 'getServerTimestamp');

  return async function submitModerationRatingResponder(request = {}) {
    if (normalizeMethod(request.method) !== 'POST') {
      return METHOD_NOT_ALLOWED_RESPONSE;
    }

    const { body = {} } = request;
    const { isApproved } = body;

    if (!ensureBoolean(isApproved)) {
      return INVALID_BODY_RESPONSE;
    }

    const authorizationHeader = getAuthorizationHeader(request);
    const token = extractBearerToken(authorizationHeader);

    if (!token) {
      return MISSING_AUTHORIZATION_RESPONSE;
    }

    let uid;
    try {
      uid = await resolveUid(verifyIdToken, token);
    } catch (err) {
      const message = err?.message || 'Invalid or expired token';
      return createResponse(401, message);
    }

    const assignment = await resolveModeratorAssignment(
      fetchModeratorAssignment,
      uid
    );

    if (!assignment) {
      return NO_JOB_RESPONSE;
    }

    const ratingId = randomUUID();
    await recordModerationRating({
      id: ratingId,
      moderatorId: uid,
      variantId: assignment.variantId,
      isApproved,
      ratedAt: getServerTimestamp(),
    });

    if (assignment.clearAssignment) {
      await assignment.clearAssignment();
    }

    return createResponse(201, {});
  };
}
