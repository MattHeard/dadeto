import {
  createCorsOptions,
  createGetModerationVariantResponder,
  createHandleCorsOrigin,
  getAllowedOrigins,
  isAllowedOrigin,
} from './get-moderation-variant-core.js';

/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {import('../../../../types/native-http').NativeExpressApp} NativeExpressApp */
/** @typedef {import('../../../../types/native-http').NativeHttpRequest} NativeHttpRequest */
/** @typedef {import('../../../../types/native-http').NativeHttpResponse} NativeHttpResponse */

/**
 * Compose the moderation-variant cloud handler around explicit effect seams.
 * @param {object} deps Runtime services, boundaries, and permission-first adapters.
 * @param {import('../../../../types/allow-effects').StartupAllowEffectsBoundary} deps.createStartupBoundary Boundary for synchronous composition effects.
 * @param {(handler: (permission: AllowEffects, req: NativeHttpRequest, res: NativeHttpResponse) => Promise<void>) => (req: NativeHttpRequest, res: NativeHttpResponse) => Promise<void>} deps.createHttpBoundary Boundary for request effects.
 * @param {(handler: (permission: AllowEffects, error: unknown, req: NativeHttpRequest, res: NativeHttpResponse & {headersSent?: boolean}) => Promise<void>) => (...args: any[]) => Promise<void>} deps.createInvocationBoundary Boundary for framework invocation effects.
 * @param {() => unknown} deps.initializeApp Firebase Admin initializer.
 * @param {(permission: AllowEffects, initializeApp: () => unknown) => unknown} deps.initializeFirebaseApp Permission-aware initializer adapter.
 * @param {(initializer: () => unknown) => {ensureFirebaseApp: () => void}} deps.createFirebaseAppManager Initialization state manager.
 * @param {(options: {ensureAppFn: () => void}) => Parameters<typeof createGetModerationVariantResponder>[0]['db']} deps.getFirestoreInstance Firestore accessor.
 * @param {() => Parameters<typeof createGetModerationVariantResponder>[0]['auth']} deps.getAuth Firebase Auth accessor.
 * @param {() => NativeExpressApp} deps.express Express app factory.
 * @param {(options: unknown) => unknown} deps.cors CORS middleware factory.
 * @param {() => Record<string, unknown>} deps.getEnvironmentVariables Runtime environment accessor.
 * @param {(permission: AllowEffects, app: NativeExpressApp, middleware: unknown) => void} deps.useMiddleware Middleware registration adapter.
 * @param {(permission: AllowEffects, app: NativeExpressApp, path: string, handler: (req: NativeHttpRequest, res: NativeHttpResponse) => unknown) => void} deps.registerGetRoute GET route registration adapter.
 * @param {(permission: AllowEffects, response: NativeHttpResponse, status: number, body: unknown) => void} deps.sendHttpResponse Text response adapter.
 * @param {(permission: AllowEffects, response: NativeHttpResponse, status: number, body: unknown) => void} deps.sendJsonResponse JSON response adapter.
 * @param {(permission: AllowEffects, error: unknown) => void} deps.logError Logging adapter.
 * @param {{region: (region: string) => {https: {onRequest: (handler: NativeExpressApp) => unknown}}} } deps.functions Firebase Functions registration factory.
 * @returns {{handle: unknown, handleGetModerationVariant: (permission: AllowEffects, req: NativeHttpRequest, res: NativeHttpResponse) => Promise<void>}} Cloud handlers.
 */
export function runGetModerationVariant(deps) {
  const resources = deps.createStartupBoundary(allowEffects => {
    const appManager = deps.createFirebaseAppManager(() =>
      deps.initializeFirebaseApp(allowEffects, deps.initializeApp)
    );
    const db = deps.getFirestoreInstance({
      ensureAppFn: appManager.ensureFirebaseApp,
    });
    const auth = deps.getAuth();
    const app = deps.express();
    const allowedOrigins = getAllowedOrigins(deps.getEnvironmentVariables());
    const corsOptions = createCorsOptions(
      createHandleCorsOrigin(isAllowedOrigin, allowedOrigins)
    );
    deps.useMiddleware(allowEffects, app, deps.cors(corsOptions));

    return { db, auth, app };
  });

  const respond = createGetModerationVariantResponder({
    db: resources.db,
    auth: resources.auth,
  });
  /**
   * @param {AllowEffects} allowEffects Permission for request effects.
   * @param {NativeHttpRequest} req Express request.
   * @param {NativeHttpResponse} res Express response.
   * @returns {Promise<void>} Completion of the response handling.
   */
  async function handleGetModerationVariant(allowEffects, req, res) {
    try {
      const { status, body } = await respond(req);
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        deps.sendJsonResponse(allowEffects, res, status, body);
        return;
      }
      deps.sendHttpResponse(allowEffects, res, status, body);
    } catch (error) {
      deps.logError(allowEffects, error);
      deps.sendHttpResponse(
        allowEffects,
        res,
        500,
        `get-moderation-variant failed: ${formatErrorMessage(error)}`
      );
    }
  }

  const handleMiddlewareError = deps.createInvocationBoundary(
    async (allowEffects, error, _req, res) => {
      deps.logError(allowEffects, error);
      if (!res.headersSent) {
        deps.sendHttpResponse(
          allowEffects,
          res,
          500,
          `get-moderation-variant middleware failed: ${formatErrorMessage(error)}`
        );
      }
    }
  );
  const handle = deps.createHttpBoundary(handleGetModerationVariant);
  deps.createStartupBoundary(allowEffects => {
    deps.registerGetRoute(allowEffects, resources.app, '/', handle);
    deps.useMiddleware(allowEffects, resources.app, handleMiddlewareError);
  });

  return {
    handle: deps.functions
      .region('europe-west1')
      .https.onRequest(resources.app),
    handleGetModerationVariant,
  };
}

/**
 * Format an error message for a user-facing failure response.
 * @param {unknown} error Failure value.
 * @returns {string} Sanitized error message.
 */
function formatErrorMessage(error) {
  return String(
    error && typeof error === 'object' && 'message' in error
      ? /** @type {{ message: unknown }} */ (error).message
      : error
  ).slice(0, 300);
}
