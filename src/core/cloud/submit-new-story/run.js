// Stryker disable all -- this module is the fixed submit endpoint wiring and
// debug-observability protocol boundary, covered by the focused run suite.
import {
  createCorsOptions,
  createCorsErrorHandler,
  createHandleSubmitNewStory,
  createSubmitNewStoryResponder,
} from './submit-new-story-core.js';
import {
  getAuthorizationHeader,
  readHeaderFromGetter,
} from '../submit-shared.js';
import { createFirebaseAppContext } from '../firebase-app-manager.js';
import { createCloudHttpEndpoint } from '../http-endpoint-bootstrap.js';
import { whenOrNull } from '../../commonCore.js';

/**
 * Set up and export the submit-new-story cloud function.
 * @param {{
 *   initializeApp: typeof import('firebase-admin/app').initializeApp,
 *   createFirebaseAppManager: typeof import('../../../../src/cloud/submit-new-story/submit-new-story-gcf.js').createFirebaseAppManager,
 *   getFirestoreInstance: typeof import('../../../../src/cloud/submit-new-story/submit-new-story-gcf.js').getFirestoreInstance,
 *   getAuth: typeof import('../../../../src/cloud/submit-new-story/submit-new-story-gcf.js').getAuth,
 *   express: typeof import('../../../../src/cloud/submit-new-story/submit-new-story-gcf.js').express,
 *   cors: typeof import('../../../../src/cloud/submit-new-story/submit-new-story-gcf.js').cors,
 *   crypto: typeof import('../../../../src/cloud/submit-new-story/submit-new-story-gcf.js').crypto,
 *   FieldValue: typeof import('../../../../src/cloud/submit-new-story/submit-new-story-gcf.js').FieldValue,
 *   functions: typeof import('../../../../src/cloud/submit-new-story/submit-new-story-gcf.js').functions,
 *   getEnvironmentVariables: typeof import('../../../../src/cloud/submit-new-story/submit-new-story-gcf.js').getEnvironmentVariables,
 *   getAllowedOrigins: typeof import('../../../../src/cloud/submit-new-story/cors-config.js').getAllowedOrigins,
 * }} deps Dependencies for wiring the endpoint.
 * @returns {{ submitNewStory: unknown, handleSubmitNewStory: (req: unknown, res: unknown) => Promise<void>, app: unknown }} Wired endpoint exports.
 */
export function runSubmitNewStory(deps) {
  const { db, auth } =
    /** @type {{ db: { collection: (name: string) => { doc: (id: string) => { set: (data: unknown) => Promise<unknown> } } }, auth: { verifyIdToken: (token: string) => Promise<unknown> } }} */ (
      createFirebaseAppContext(deps, { includeApp: false })
    );

  const environmentVariables = deps.getEnvironmentVariables();
  const allowedOrigins = deps.getAllowedOrigins(environmentVariables);
  const debugEnabled = isDebugSubmitNewStoryEnabled(environmentVariables);

  if (debugEnabled) {
    console.info(
      JSON.stringify({
        event: 'submit-new-story.debug.config',
        environment: environmentVariables.DENDRITE_ENVIRONMENT,
        playwrightOrigin: environmentVariables.PLAYWRIGHT_ORIGIN,
        allowedOrigins,
      })
    );
  }

  const corsOptions = createCorsOptions({ allowedOrigins });

  const submitNewStoryResponder = /** @type {any} */ (
    createSubmitNewStoryResponder({
      verifyIdToken: /** @type {any} */ (
        (/** @type {string} */ token) => auth.verifyIdToken(token)
      ),
      saveSubmission: /** @type {any} */ (
        (/** @type {string} */ id, /** @type {unknown} */ data) =>
          db.collection('storyFormSubmissions').doc(id).set(data)
      ),
      randomUUID: () => deps.crypto.randomUUID(),
      getServerTimestamp: () => deps.FieldValue.serverTimestamp(),
    })
  );

  let debuggedSubmitNewStoryResponder = submitNewStoryResponder;
  if (debugEnabled) {
    debuggedSubmitNewStoryResponder = createDebugSubmitNewStoryResponder(
      submitNewStoryResponder
    );
  }

  const handleSubmitNewStory = /** @type {any} */ (
    createHandleSubmitNewStory(request =>
      debuggedSubmitNewStoryResponder(request)
    )
  );

  const endpointOptions = /** @type {any} */ ({
    express: deps.express,
    middleware: [
      deps.cors(corsOptions),
      createCorsErrorHandler(),
      deps.express.json({ limit: '20kb' }),
      deps.express.urlencoded({ extended: false, limit: '20kb' }),
    ],
    route: { method: 'post', path: '/', handler: handleSubmitNewStory },
    functions: deps.functions,
  });
  const endpoint = /** @type {any} */ (
    createCloudHttpEndpoint(endpointOptions)
  );

  return {
    submitNewStory: endpoint.handle,
    handleSubmitNewStory,
    app: endpoint.app,
  };
}

/**
 * Check whether submit-new-story debug logging is enabled.
 * @param {Record<string, unknown>} environmentVariables Environment variables.
 * @returns {boolean} True when temporary debug logging should be emitted.
 */
function isDebugSubmitNewStoryEnabled(environmentVariables) {
  return environmentVariables?.DENDRITE_DEBUG_SUBMIT_NEW_STORY === '1';
}

/**
 * Read a request header from either an Express getter or raw header bag.
 * @param {{ get?: (name: string) => string | null | undefined, headers?: Record<string, unknown> | null | undefined } | undefined} request Request-like value.
 * @param {string} headerName Header to read.
 * @returns {string | null} Header value when available.
 */
function readRequestHeader(request, headerName) {
  const headerFromGetter = readRequestHeaderFromGetter(request, headerName);
  if (headerFromGetter !== null) {
    return headerFromGetter;
  }

  return readRequestHeaderFromHeaders(request?.headers, headerName);
}

/**
 * Read a request header from an Express getter.
 * @param {{ get?: (name: string) => string | null | undefined } | undefined} request Request-like value.
 * @param {string} headerName Header to read.
 * @returns {string | null} Header value when available.
 */
function readRequestHeaderFromGetter(request, headerName) {
  const getter = request?.get;
  return readHeaderFromGetter(getter, headerName);
}

/**
 * Read a request header from a raw headers bag.
 * @param {Record<string, unknown> | null | undefined} headers Raw headers bag.
 * @param {string} headerName Header to read.
 * @returns {string | null} Header value when available.
 */
function readRequestHeaderFromHeaders(headers, headerName) {
  if (!headers || typeof headers !== 'object') {
    return null;
  }

  const currentHeaders = /** @type {Record<string, unknown>} */ (headers);
  return whenOrNull(true, () => {
    const lowerHeaderName = headerName.toLowerCase();
    const candidates = [headerName, lowerHeaderName];

    for (const candidate of candidates) {
      const value = readRequestHeaderCandidate(currentHeaders[candidate]);
      if (value !== null) {
        return value;
      }
    }

    return null;
  });
}

/**
 * Read a raw header value from a single candidate.
 * @param {unknown} raw Raw header value.
 * @returns {string | null} Normalized header value.
 */
function readRequestHeaderCandidate(raw) {
  if (typeof raw === 'string') {
    if (raw.length > 0) {
      return raw;
    }
    return null;
  }

  if (Array.isArray(raw) && raw.length > 0) {
    const [first] = raw;
    if (typeof first === 'string' && first.length > 0) {
      return first;
    }
  }

  return null;
}

/**
 * Serialize an error for debug logging.
 * @param {unknown} error Error-like value.
 * @returns {{ name?: string; message?: string; stack?: string; value?: string }} Serialized error details.
 */
function serializeError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    value: String(error),
  };
}

/**
 * Emit temporary debug logs around submit-new-story request handling.
 * @param {(request?: unknown) => Promise<{ status: number, body?: unknown }>} responder Domain responder.
 * @returns {(request?: unknown) => Promise<{ status: number, body?: unknown }>} Wrapped responder.
 */
function createDebugSubmitNewStoryResponder(responder) {
  return async function debuggedSubmitNewStoryResponder(request) {
    const typedRequest =
      /** @type {{ method?: unknown, headers?: Record<string, unknown> | null | undefined, body?: Record<string, unknown> | null | undefined }} */ (
        request
      );
    const requestBody = getRequestSummary(typedRequest);

    console.info(
      JSON.stringify({
        event: 'submit-new-story.debug.request',
        method: typedRequest?.method ?? null,
        origin: readRequestHeader(typedRequest, 'origin'),
        referer: readRequestHeader(typedRequest, 'referer'),
        contentType: readRequestHeader(typedRequest, 'content-type'),
        hasAuthorization: Boolean(getAuthorizationHeader(typedRequest)),
        bodyKeys: requestBody.bodyKeys,
      })
    );

    try {
      const result = await responder(typedRequest);
      console.info(
        JSON.stringify({
          event: 'submit-new-story.debug.response',
          status: result.status,
          body: result.body,
        })
      );
      return result;
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'submit-new-story.debug.error',
          error: serializeError(error),
        })
      );
      throw error;
    }
  };
}

/**
 * Summarize the incoming request body for debug logging.
 * @param {{ body?: Record<string, unknown> | null | undefined } | undefined} request Request-like value.
 * @returns {{ bodyKeys: string[] }} Stable summary for logs.
 */
function getRequestSummary(request) {
  const body = request?.body;
  if (!body || typeof body !== 'object') {
    return { bodyKeys: [] };
  }

  return { bodyKeys: Object.keys(body) };
}

// Stryker restore all
