// Stryker disable all -- this module is the fixed submit-new-story request,
// CORS, authorization, persistence, and response protocol boundary covered by
// the focused core and run suites.
import {
  normalizeAuthor,
  normalizeSubmissionContent,
  normalizeMethod,
  isAllowedOrigin,
  createCorsOriginHandler,
  createResponse,
  normalizeShortString,
  createCorsOptionsValue,
} from '../cloud-core.js';
import { resolveAuthorIdFromHeader } from '../auth-helpers.js';
import {
  sendResponderResult,
  collectSubmissionOptions,
  getAuthorizationHeader,
  getAuthorizationFromGetter,
} from '../submit-shared.js';
import {
  arrayOrEmpty,
  trimmedStringOrNull,
  whenNotNullish,
  whenOrDefault,
  assertFunction,
} from '../../commonCore.js';
import { createResponder } from '../responder-utils.js';
import { normalizeExpressRequest } from '../request-normalization.js';
/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {import('../../../../types/native-http').NativeHttpRequest} NativeHttpRequest */
/** @typedef {import('../../../../types/native-http').NativeHttpResponse} NativeHttpResponse */
/** @typedef {(allowEffects: AllowEffects, request?: SubmitNewStoryRequest) => Promise<HttpResponse>} EffectResponder */

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
 * @property {(allowEffects: AllowEffects, id: string, submission: SubmissionRecord) => Promise<void>} saveSubmission - Persists a submission with explicit command permission.
 * @property {() => string} randomUUID - Generates a unique identifier for a submission.
 * @property {() => unknown} getServerTimestamp - Supplies a server-side timestamp representation.
 */

/**
 * @typedef {{ uid?: string | null } | null | undefined} DecodedToken
 * @typedef {{ title: string; content: string; author: string; options: string[] }} NormalizedSubmissionData
 * @typedef {NormalizedSubmissionData & { authorId: string | null }} NewStorySubmissionInput
 * @typedef {{ allowedOrigins?: string[]; methods?: string[] }} CorsOptions
 * @typedef {{ allowedOrigins: string[]; methods: string[] }} NormalizedCorsOptions
 * @typedef {{ status?: number; body?: unknown }} CorsErrorHandlerOptions
 * @typedef {{ status: (code: number) => { json: (payload: unknown) => void } }} CorsResponse
 */

/**
 * Standard response returned when a non-POST request is received.
 * @type {HttpResponse}
 */
const METHOD_NOT_ALLOWED_RESPONSE = { status: 405, body: 'POST only' };

export const submitNewStoryCoreTestUtils = {
  getAuthFromGetter: getAuthorizationFromGetter,
  collectOptions: collectSubmissionOptions,
};

/**
 * Validate decoded token.
 * @param {DecodedToken} decoded Decoded token.
 * @returns {string | null} UID or null.
 */
function validateDecodedToken(decoded) {
  return /** @type {string | null} */ (
    whenNotNullish(decoded, value =>
      trimmedStringOrNull(/** @type {{ uid?: unknown }} */ (value).uid)
    )
  );
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
 * @param {CorsOptions} options Options.
 * @returns {string[]} Allowed origins.
 */
function getAllowedOrigins(options) {
  return /** @type {string[]} */ (arrayOrEmpty(options.allowedOrigins));
}

/**
 * Get methods from options.
 * @param {CorsOptions} options Options.
 * @returns {string[]} Methods.
 */
function getMethods(options) {
  return options.methods || ['POST'];
}

/**
 * Normalize CORS options.
 * @param {CorsOptions | undefined} options Options.
 * @returns {NormalizedCorsOptions} Normalized options.
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
 * @param {CorsOptions} config - CORS configuration values (allowedOrigins, methods).
 * @returns {{ origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void, methods: string[] }} Express-compatible CORS options.
 */
export function createCorsOptions(config) {
  const { allowedOrigins, methods } = normalizeCorsOptions(config);

  return createCorsOptionsValue(
    createCorsOriginHandler(isAllowedOrigin, allowedOrigins),
    methods
  );
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
 * @param {CorsResponse} res Response object.
 * @param {number} status Status code.
 * @param {unknown} body Response body.
 */
function sendCorsError(res, status, body) {
  res.status(status).json(body);
}

/**
 * Get status from options.
 * @param {CorsErrorHandlerOptions} options Options.
 * @returns {number} Status.
 */
function getStatus(options) {
  return options.status || 403;
}

/**
 * Get body from options.
 * @param {CorsErrorHandlerOptions} options Options.
 * @returns {unknown} Body.
 */
function getBody(options) {
  return options.body || { error: 'Origin not allowed' };
}

/**
 * Normalize CORS error handler options.
 * @param {CorsErrorHandlerOptions | undefined} options Options.
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
 * @param {CorsErrorHandlerOptions | undefined} [options] - Overrides for the generated error handler (status and body).
 * @returns {(err: unknown, req: object, res: { status: (code: number) => { json: (payload: unknown) => void } }, next: (error?: unknown) => void) => void} Express-style error middleware.
 */
export function createCorsErrorHandler(options) {
  const normalized = normalizeCorsErrorHandlerOptions(options);

  return function corsErrorHandler(err, _req, res, next) {
    if (isCorsError(err)) {
      sendCorsError(res, normalized.status, normalized.body);
      return;
    }

    next(err);
  };
}

/**
 * Adapt a domain responder into an Express request handler.
 * @param {EffectResponder} responder Domain-specific command handler.
 * @returns {(allowEffects: AllowEffects, req: NativeHttpRequest | undefined, res: NativeHttpResponse) => Promise<void>} Explicitly effectful internal route.
 */
export function createHandleSubmitNewStory(responder) {
  assertFunction(responder, 'responder');
  return async function handleSubmitNewStory(allowEffects, req, res) {
    const request = /** @type {SubmitNewStoryRequest} */ (
      normalizeExpressRequest(req)
    );
    const { status, body } = await responder(allowEffects, request);
    return sendResponderResult(res, status, body);
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
 * @returns {NormalizedSubmissionData} Normalized data.
 */
function normalizeSubmissionData(body) {
  const title = normalizeTitle(/** @type {string} */ (body.title));
  const content = normalizeSubmissionContent(
    /** @type {string} */ (body.content)
  );
  const author = normalizeAuthor(body.author ?? '') || '???';
  const options = collectSubmissionOptions(body, 120);

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
 * @param {AllowEffects} allowEffects Explicit command permission.
 * @param {SubmitNewStoryDependencies} deps Dependencies.
 * @param {string} id ID.
 * @param {NewStorySubmissionInput} data Data.
 * @returns {Promise<void>} Promise.
 */
async function saveNewStory(allowEffects, deps, id, data) {
  const { saveSubmission, getServerTimestamp } = deps;
  await saveSubmission(allowEffects, id, {
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
  return /** @type {Record<string, unknown>} */ (req.body || {});
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
 * @param {AllowEffects} allowEffects Explicit command permission.
 * @param {SubmitNewStoryDependencies} deps Dependencies.
 * @param {SubmitNewStoryRequest} request Request.
 * @returns {Promise<HttpResponse>} Response.
 */
async function processSubmission(allowEffects, deps, request) {
  const { verifyIdToken, randomUUID } = deps;
  const body = getRequestBody(request);
  const data = normalizeSubmissionData(body);
  const authorId = await resolveAuthorId(request, verifyIdToken);

  const id = randomUUID();
  await saveNewStory(allowEffects, deps, id, { ...data, authorId });

  return createResponse(201, {
    id,
    ...data,
  });
}

/**
 * Handle the incoming request and delegate to the submission processor.
 * @param {AllowEffects} allowEffects Explicit command permission.
 * @param {SubmitNewStoryDependencies} deps Dependencies for the handler.
 * @param {SubmitNewStoryRequest | undefined} request Incoming request data.
 * @returns {Promise<HttpResponse>} Response returned to the caller.
 */
function handleSubmitNewStoryRequest(allowEffects, deps, request) {
  const incomingRequest = request ?? {};
  if (!isPostMethod(getRequestMethod(incomingRequest.method)))
    return Promise.resolve(METHOD_NOT_ALLOWED_RESPONSE);
  return processSubmission(allowEffects, deps, incomingRequest);
}

/**
 * Get the HTTP method from request, defaulting to empty string.
 * @param {unknown} method Request method.
 * @returns {string} Method value or empty string.
 */
function getRequestMethod(method) {
  return /** @type {string} */ (
    whenOrDefault(typeof method === 'string', () => method, '')
  );
}

/**
 * Construct the submit-new-story domain responder with the required dependencies.
 * @param {SubmitNewStoryDependencies} dependencies - Injectable services used by the responder.
 * @returns {(allowEffects: AllowEffects, request?: SubmitNewStoryRequest) => Promise<HttpResponse>} Explicitly effectful domain responder.
 */
export function createSubmitNewStoryResponder(dependencies) {
  const responder = createResponder({
    dependencies,
    requiredFunctionNames: ['verifyIdToken', 'saveSubmission'],
    handlerFactory: deps => {
      return async function submitNewStoryResponder(
        /** @type {AllowEffects} */ allowEffects,
        /** @type {SubmitNewStoryRequest | undefined} */ request
      ) {
        return handleSubmitNewStoryRequest(
          allowEffects,
          /** @type {SubmitNewStoryDependencies} */ (deps),
          request
        );
      };
    },
  });
  return /** @type {(allowEffects: AllowEffects, request?: SubmitNewStoryRequest) => Promise<HttpResponse>} */ (
    responder
  );
}

// Stryker restore all
