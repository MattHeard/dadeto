import { isNonNullObject } from './common-core.js';
import {
  matchBearerToken,
  normalizeMethod,
  getHeaderFromGetter,
  isAllowedOrigin,
  createResponse,
  MISSING_AUTHORIZATION_RESPONSE,
  NO_JOB_RESPONSE,
  normalizeAuthorizationCandidate,
  returnErrorResultOrValue,
} from './cloud-core.js';
import { createCloudSubmitHandler } from '../submit-shared.js';
import { createResponder } from '../responder-utils.js';

const METHOD_NOT_ALLOWED_RESPONSE = { status: 405, body: 'POST only' };
const INVALID_BODY_RESPONSE = {
  status: 400,
  body: 'Missing or invalid isApproved',
};

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
 * Try authorization headers.
 * @param {Function} getter Getter.
 * @returns {string | null} Header.
 */
function tryAuthorizationHeaders(getter) {
  const uppercase = getHeaderFromGetter(getter, 'Authorization');
  if (uppercase) {
    return uppercase;
  }
  return getHeaderFromGetter(getter, 'authorization');
}

/**
 * Resolve the Authorization header from Express-like request shapes.
 * @param {SubmitModerationRatingRequest | undefined} request Request object supplied by the adapter.
 * @returns {string | null} Raw Authorization header value or null when absent.
 */
function readAuthorizationFromGetter(request) {
  return tryAuthorizationHeaders(request?.get);
}

/**
 * Coerce an Authorization header candidate into a normalized string.
 * @param {unknown} value Header value sourced from Express request metadata.
 * @returns {string | null} String representation of the header or null when unavailable.
 */
function coerceAuthorizationHeader(value) {
  return normalizeAuthorizationCandidate(value);
}

/**
 * Resolve the Authorization header from a headers object.
 * @param {Record<string, unknown> | null | undefined} headers Raw headers provided by the caller.
 * @returns {string | null} Header value when present, otherwise null.
 */
/**
 * Find auth in headers.
 * @param {Record<string, unknown>} headers Headers.
 * @returns {string | null} Auth header.
 */
function findAuthInHeaders(headers) {
  const lowercase = coerceAuthorizationHeader(headers.authorization);
  if (lowercase !== null) {
    return lowercase;
  }
  return coerceAuthorizationHeader(headers.Authorization);
}

/**
 * Parse the Authorization header from a raw headers object.
 * @param {Record<string, unknown> | null | undefined} headers Headers provided by the HTTP adapter.
 * @returns {string | null} Normalized Authorization value or null when absent.
 */
function readAuthorizationFromHeaders(headers) {
  const normalizedHeaders = normalizeHeadersObject(headers);
  if (!normalizedHeaders) {
    return null;
  }

  return findAuthInHeaders(normalizedHeaders);
}

/**
 * Normalize headers to an object when possible.
 * @param {unknown} headers Headers.
 * @returns {Record<string, unknown> | null} Headers or null.
 */
function normalizeHeadersObject(headers) {
  if (!isNonNullObject(headers)) {
    return null;
  }

  return headers;
}

/**
 * Resolve an Authorization header from a heterogeneous request shape.
 * @param {{ get?: (name: string) => unknown, headers?: Record<string, unknown> | null }} request Request-like value.
 * @returns {string | null} Header value when present, otherwise null.
 */
function getAuthorizationHeader(request) {
  return resolveFirstNonNullValue(
    () => readAuthorizationFromGetter(request),
    () => readAuthorizationFromHeaders(request?.headers)
  );
}

/**
 * Iterate through resolver callbacks until a non-null string is returned.
 * @param {...() => string | null} resolvers Resolver callbacks evaluated in order.
 * @returns {string | null} First non-null result or null when none match.
 */
function resolveFirstNonNullValue(...resolvers) {
  return resolvers.reduce((result, resolver) => {
    if (result === null) {
      return resolver();
    }

    return result;
  }, null);
}

/**
 * Extract a bearer token from an Authorization header string.
 * @param {string | null} header Authorization header retrieved from the request.
 * @returns {string | null} Bearer token contained in the header or null when invalid.
 */
/**
 * Extract the bearer token from a normalized Authorization header.
 * @param {string | null} header Authorization header content.
 * @returns {string | null} Extracted token or null when the header is invalid.
 */
function extractBearerToken(header) {
  if (typeof header !== 'string') {
    return null;
  }
  return matchBearerToken(header);
}

/**
 * Determine whether an origin is included in the allow-list.
 * @param {string | undefined} origin Origin reported by the client.
 * @param {string[]} allowedOrigins Normalized allow-list for the endpoint.
 * @returns {boolean} True when the origin may access the endpoint.
 */
/**
 * Normalize origins defined in the configuration.
 * @param {unknown} allowedOrigins Raw origins value.
 * @returns {string[]} Array of origin strings.
 */
function normalizeOrigins(allowedOrigins) {
  if (Array.isArray(allowedOrigins)) {
    return allowedOrigins;
  }
  return [];
}

/**
 * Build CORS options consumed by the moderation responder.
 * @param {{
 *   allowedOrigins?: string[] | null,
 *   methods?: string[]
 * }} config Configuration values for CORS behavior.
 * @returns {{
 *   origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void,
 *   methods: string[]
 * }} Express-compatible CORS configuration.
 */
export function createCorsOptions({ allowedOrigins, methods = ['POST'] }) {
  const origins = normalizeOrigins(allowedOrigins);

  return {
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin, origins)) {
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
const moderationSubmitHandler = createCloudSubmitHandler;

export { moderationSubmitHandler as createHandleSubmitModerationRating };

/**
 * Determine whether a value is a boolean literal.
 * @param {unknown} value Candidate value to evaluate.
 * @returns {value is boolean} True when the value is a boolean.
 */
function ensureBoolean(value) {
  return typeof value === 'boolean';
}

/**
 * Validate decoded UID.
 * @param {object} decoded Decoded token.
 * @returns {string | null} UID or null.
 */
function validateDecodedUid(decoded) {
  return normalizeUid(decoded?.uid);
}

/**
 * Check for non-empty string.
 * @param {unknown} value Value.
 * @returns {value is string} True if non-empty string.
 */
function isNonEmptyString(value) {
  if (typeof value !== 'string') {
    return false;
  }

  return value.length > 0;
}

/**
 * Normalize UID to string or null.
 * @param {unknown} uid UID.
 * @returns {string | null} UID or null.
 */
function normalizeUid(uid) {
  if (isNonEmptyString(uid)) {
    return uid;
  }

  return null;
}

/**
 * Create token error.
 * @param {unknown} err Error.
 * @returns {Error} Token error.
 */
function createTokenError(err) {
  const message = getTokenErrorMessage(err);
  const error = Object.assign(new Error(message), { code: 'invalid-token' });
  stripDefaultTokenMessage(error, message);
  return error;
}

/**
 * Resolve token error message.
 * @param {unknown} err Error.
 * @returns {string} Message.
 */
function getTokenErrorMessage(err) {
  const message = extractErrorMessage(err);
  if (isNonEmptyString(message)) {
    return message;
  }

  return 'Invalid or expired token';
}

/**
 * Extract message from unknown error.
 * @param {unknown} err Error.
 * @returns {string | undefined} Message.
 */
function extractErrorMessage(err) {
  return err?.message;
}

/**
 * Remove default token message when needed.
 * @param {Error} error Error.
 * @param {string} message Message.
 * @returns {void}
 */
function stripDefaultTokenMessage(error, message) {
  if (message === 'Invalid or expired token') {
    delete error.message;
  }
}

/**
 * Verify token and get UID.
 * @param {Function} verifyIdToken Verifier.
 * @param {string} token Token.
 * @returns {Promise<string>} UID.
 */
async function verifyAndGetUid(verifyIdToken, token) {
  const decoded = await verifyIdToken(token);
  const uid = validateDecodedUid(decoded);
  if (uid) {
    return uid;
  }
  throw Object.assign(new Error('Invalid or expired token'), {
    code: 'invalid-token',
  });
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
    return await verifyAndGetUid(verifyIdToken, token);
  } catch (err) {
    throw createTokenError(err);
  }
}

/**
 * Validate variant ID.
 * @param {string} variantId Variant ID.
 * @returns {boolean} True if valid.
 */
function isValidVariantId(variantId) {
  return typeof variantId === 'string' && variantId.length > 0;
}

/**
 * Normalize clear assignment.
 * @param {unknown} clearAssignment Clear assignment.
 * @returns {Function | null} Normalized.
 */
function normalizeClearAssignment(clearAssignment) {
  if (typeof clearAssignment === 'function') {
    return clearAssignment;
  }
  return null;
}

/**
 * Build assignment result.
 * @param {object} assignment Assignment.
 * @returns {object} Result.
 */
function buildAssignmentResult(assignment) {
  return {
    variantId: assignment.variantId,
    clearAssignment: normalizeClearAssignment(assignment.clearAssignment),
  };
}

/**
 * Resolve the moderator assignment for a verified user identifier.
 * @param {SubmitModerationRatingDependencies['fetchModeratorAssignment']} fetchModeratorAssignment Function that fetches pending assignments.
 * @param {string} uid Verified user identifier extracted from the token.
 * @returns {Promise<ModeratorAssignment | null>} Assignment metadata when available or null when missing.
 */
async function resolveModeratorAssignment(fetchModeratorAssignment, uid) {
  const assignment = await fetchModeratorAssignment(uid);

  if (!isValidAssignment(assignment)) {
    return null;
  }

  return buildAssignmentResult(assignment);
}

/**
 * Validate assignment shape.
 * @param {ModeratorAssignment | null | undefined} assignment Assignment.
 * @returns {assignment is ModeratorAssignment} True if valid.
 */
function isValidAssignment(assignment) {
  if (!assignment) {
    return false;
  }

  return isValidVariantId(assignment.variantId);
}

/**
 * Build the domain responder that processes moderation rating submissions.
 * @param {SubmitModerationRatingDependencies} dependencies Functions required to process the request.
 * @returns {(request?: SubmitModerationRatingRequest) => Promise<SubmitModerationRatingResponse>} Responder that validates and processes submissions.
 */
export function createSubmitModerationRatingResponder(dependencies) {
  return createResponder({
    dependencies,
    requiredFunctionNames: [
      'verifyIdToken',
      'fetchModeratorAssignment',
      'recordModerationRating',
    ],
    handlerFactory: deps => {
      const {
        verifyIdToken,
        fetchModeratorAssignment,
        recordModerationRating,
        randomUUID,
        getServerTimestamp,
      } = deps;

      /**
       *
       * @param context
       */
      /**
       * Process a rating when prerequisites and context are valid.
       * @param {{ contextResult: { uid?: string, assignment?: ModeratorAssignment }, bodyResult: { isApproved?: boolean } }} context Context data.
       * @returns {Promise<object>} Success response payload.
       */
      async function processValidRating(context) {
        const { contextResult, bodyResult } = context;

        const ratingId = randomUUID();
        await recordModerationRating({
          id: ratingId,
          moderatorId: contextResult.uid,
          variantId: contextResult.assignment.variantId,
          isApproved: bodyResult.isApproved,
          ratedAt: getServerTimestamp(),
        });

        await clearAssignment(contextResult.assignment);

        return createResponse(201, {});
      }

      /**
       *
       * @param bodyResult
       * @param contextResult
       */
      /**
       * Build the response once the context lookup finishes.
       * @param {{ isApproved?: boolean, error?: SubmitModerationRatingResponse }} bodyResult Body validation result.
       * @param {{ uid?: string, assignment?: ModeratorAssignment, error?: SubmitModerationRatingResponse }} contextResult Moderator context outcome.
       * @returns {Promise<SubmitModerationRatingResponse>} Handler response.
       */
      function resolveResponseFromContext(bodyResult, contextResult) {
        if (contextResult.error) {
          return Promise.resolve(contextResult.error);
        }

        return processValidRating({ contextResult, bodyResult });
      }

      /**
       *
       * @param prerequisiteResult
       */
      /**
       * Resolve the moderator context or propagate the prerequisite error.
       * @param {{ error?: SubmitModerationRatingResponse, token?: string }} prerequisiteResult Prerequisite outcome.
       * @returns {Promise<{ uid?: string, assignment?: ModeratorAssignment, error?: SubmitModerationRatingResponse }>} Context resolution result.
       */
      function resolveContextResult(prerequisiteResult) {
        if (prerequisiteResult.error) {
          return Promise.resolve({ error: prerequisiteResult.error });
        }

        return resolveModeratorContext({
          verifyIdToken,
          fetchModeratorAssignment,
          token: prerequisiteResult.token,
        });
      }

      return async function submitModerationRatingResponder(request = {}) {
        const prerequisiteResult = resolveRequestPrerequisites(request);
        const contextResult = await resolveContextResult(prerequisiteResult);

        return resolveResponseFromContext(
          prerequisiteResult.bodyResult,
          contextResult
        );
      };
    },
  });
}

/**
 * Validate incoming request method.
 * @param {unknown} method Method.
 * @returns {SubmitModerationRatingResponse | null} Error when invalid.
 */
function validateRequestMethod(method) {
  if (normalizeMethod(method) === 'POST') {
    return null;
  }

  return METHOD_NOT_ALLOWED_RESPONSE;
}

/**
 * Resolve prerequisites needed for further processing.
 * @param {SubmitModerationRatingRequest} request Request.
 * @returns {{ error?: SubmitModerationRatingResponse, bodyResult?: { isApproved: boolean }, token?: string }} Result.
 */
function resolveRequestPrerequisites(request) {
  const methodError = validateRequestMethod(request.method);
  const bodyResult = validateRatingBody(request.body);
  const tokenResult = resolveAuthorizationToken(request);
  const error = findFirstError([
    methodError,
    bodyResult.error,
    tokenResult.error,
  ]);

  return returnErrorResultOrValue(error, () => ({
    bodyResult,
    token: tokenResult.token,
  }));
}

/**
 * Find the first error in a list.
 * @param {Array<SubmitModerationRatingResponse | undefined | null>} errors Errors.
 * @returns {SubmitModerationRatingResponse | undefined} First error.
 */
function findFirstError(errors) {
  return errors.find(error => Boolean(error));
}

/**
 * Extract is approved from body.
 * @param {unknown} body Body.
 * @returns {unknown} Is approved.
 */
function extractIsApproved(body) {
  if (!isNonNullObject(body)) {
    return undefined;
  }

  return body.isApproved;
}

/**
 * Validate the submitted rating payload.
 * @param {unknown} body Request body parsed by the HTTP handler.
 * @returns {{ isApproved?: boolean, error?: SubmitModerationRatingResponse }} Validation outcome containing the normalized approval flag or an error response.
 */
function validateRatingBody(body) {
  const isApproved = extractIsApproved(body);

  if (!ensureBoolean(isApproved)) {
    return { error: INVALID_BODY_RESPONSE };
  }

  return { isApproved };
}

/**
 * Resolve a bearer token from the inbound request.
 * @param {SubmitModerationRatingRequest | undefined} request Incoming request object.
 * @returns {{ token: string } | { error: SubmitModerationRatingResponse }} Result containing the token or an error response.
 */
function resolveAuthorizationToken(request) {
  const authorizationHeader = getAuthorizationHeader(request);
  const token = extractBearerToken(authorizationHeader);

  if (!token) {
    return { error: MISSING_AUTHORIZATION_RESPONSE };
  }

  return { token };
}

/**
 * Resolve UID safely.
 * @param {Function} verifyIdToken Verifier.
 * @param {string} token Token.
 * @returns {Promise<object>} Result.
 */
async function resolveUidSafely(verifyIdToken, token) {
  return resolveUid(verifyIdToken, token)
    .then(uid => ({ uid }))
    .catch(err => ({ error: createResponse(401, getTokenErrorMessage(err)) }));
}

/**
 * Resolve assignment and build context.
 * @param {Function} fetchModeratorAssignment Fetcher.
 * @param {string} uid UID.
 * @returns {Promise<object>} Result.
 */
async function resolveAssignmentAndBuildContext(fetchModeratorAssignment, uid) {
  const assignment = await resolveModeratorAssignment(
    fetchModeratorAssignment,
    uid
  );

  if (!assignment) {
    return { error: NO_JOB_RESPONSE };
  }

  return { uid, assignment };
}

/**
 * Resolve the moderator context based on the provided token and helpers.
 * @param {{
 *   verifyIdToken: SubmitModerationRatingDependencies['verifyIdToken'],
 *   fetchModeratorAssignment: SubmitModerationRatingDependencies['fetchModeratorAssignment'],
 *   token: string
 * }} deps Dependencies required to validate the token and load the assignment.
 * @returns {Promise<{ uid?: string, assignment?: ModeratorAssignment, error?: SubmitModerationRatingResponse }>} Resulting context or an error response.
 */
async function resolveModeratorContext({
  verifyIdToken,
  fetchModeratorAssignment,
  token,
}) {
  const uidResult = await resolveUidSafely(verifyIdToken, token);
  if (uidResult.error) {
    return uidResult;
  }

  return resolveAssignmentAndBuildContext(
    fetchModeratorAssignment,
    uidResult.uid
  );
}

/**
 * Invoke the assignment cleanup callback when present.
 * @param {ModeratorAssignment} assignment Assignment returned from the resolver.
 * @returns {Promise<void>}
 */
async function clearAssignment(assignment) {
  if (assignment.clearAssignment) {
    await assignment.clearAssignment();
  }
}
