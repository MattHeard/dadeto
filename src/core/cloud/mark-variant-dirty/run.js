import {
  createCorsOptions,
  createHandleCorsOrigin,
  createHandleRequest,
  createIsAdminUid,
  findPageRef,
  findPagesSnap,
  findVariantsSnap,
  getAllowedOrigins,
  markVariantDirtyImpl,
  markAuthorDirtyImpl,
  parseMarkVariantRequestBody,
  refFromSnap,
} from './mark-variant-dirty-core.js';
import { createVerifyAdmin, isAllowedOrigin } from '../cloud-core.js';

/**
 * Wire and return the mark-variant-dirty cloud exports.
 * @param {{
 *   initializeApp: typeof import('firebase-admin/app').initializeApp,
 *   createFirebaseAppManager: typeof import('../../../../src/cloud/mark-variant-dirty/mark-variant-dirty-gcf.js').createFirebaseAppManager,
 *   getFirestoreInstance: typeof import('../../../../src/cloud/mark-variant-dirty/mark-variant-dirty-gcf.js').getFirestoreInstance,
 *   getAuth: typeof import('../../../../src/cloud/mark-variant-dirty/mark-variant-dirty-gcf.js').getAuth,
 *   express: typeof import('../../../../src/cloud/mark-variant-dirty/mark-variant-dirty-gcf.js').express,
 *   cors: typeof import('../../../../src/cloud/mark-variant-dirty/mark-variant-dirty-gcf.js').cors,
 *   functions: typeof import('../../../../src/cloud/mark-variant-dirty/mark-variant-dirty-gcf.js').functions,
 *   getEnvironmentVariables: typeof import('../../../../src/cloud/mark-variant-dirty/mark-variant-dirty-gcf.js').getEnvironmentVariables,
 *   bindStartupEffectBoundary: import('../../../../types/allow-effects').StartupAllowEffectsBoundary,
 *   initializeFirebaseApp: (permission: import('../../../../types/allow-effects').AllowEffects, initializeApp: typeof import('firebase-admin/app').initializeApp) => unknown,
 *   bindEffectInvocationBoundary: import('../../../../types/allow-effects').EffectInvocationBoundary,
 *   useMiddleware: (permission: import('../../../../types/allow-effects').AllowEffects, app: import('../../../../types/native-http').NativeExpressApp, middleware: unknown) => void,
 *   registerPostRoute: (permission: import('../../../../types/allow-effects').AllowEffects, app: import('../../../../types/native-http').NativeExpressApp, path: string, handler: Function) => void,
 *   updateDocument: (permission: import('../../../../types/allow-effects').AllowEffects, reference: unknown, data: object) => Promise<unknown>,
 *   sendResponse: (permission: import('../../../../types/allow-effects').AllowEffects, res: import('../../../../types/native-http').NativeHttpResponse, status: number, method: 'send' | 'json', body: unknown) => void,
 *   logWarning: (permission: import('../../../../types/allow-effects').AllowEffects, message: string, details?: object) => void,
 *   logDebug: (permission: import('../../../../types/allow-effects').AllowEffects, ...values: unknown[]) => void,
 *   ADMIN_UID: string,
 * }} deps Dependencies required to compose the mark-variant-dirty endpoint.
 * @returns {{ markVariantDirty: unknown, handleRequest: (...args: never[]) => unknown, app: unknown }} Wired cloud export objects for index.js.
 */
export function runMarkVariantDirty(deps) {
  const { auth, db, app } = deps.bindStartupEffectBoundary(allowEffects => {
    const appManager = deps.createFirebaseAppManager(permission =>
      deps.initializeFirebaseApp(permission, deps.initializeApp)
    );
    appManager.ensureFirebaseApp(allowEffects);
    const environment = deps.getEnvironmentVariables();
    return {
      auth: deps.getAuth(),
      db: deps.getFirestoreInstance(allowEffects, {
        ensureAppFn: () => {},
        environment,
      }),
      app: deps.express(),
    };
  });

  const environmentVariables = deps.getEnvironmentVariables();
  const allowedOrigins = deps.bindStartupEffectBoundary(permission =>
    getAllowedOrigins(permission, environmentVariables, deps.logDebug)
  );
  const handleCorsOrigin = createHandleCorsOrigin(
    isAllowedOrigin,
    allowedOrigins
  );
  // Stryker disable all -- endpoint wiring uses the fixed POST CORS protocol.
  const corsOptions = createCorsOptions(handleCorsOrigin, ['POST']);

  deps.bindStartupEffectBoundary(allowEffects =>
    deps.useMiddleware(allowEffects, app, deps.cors(corsOptions))
  );
  const jsonMiddleware = deps.express.json();
  deps.bindStartupEffectBoundary(allowEffects =>
    deps.useMiddleware(allowEffects, app, jsonMiddleware)
  );

  const markVariantDirtyDeps = {
    db,
    updateDocument: deps.updateDocument,
    firebase: {
      findPageRef,
      findPagesSnap,
      findVariantsSnap,
      refFromSnap,
    },
  };
  const sendResponse = deps.sendResponse;
  const logWarning = deps.logWarning;
  // Stryker restore all

  /**
   * @param {number} pageNumber Page number.
   * @param {string} variantName Variant name.
   * @returns {Promise<boolean>} Result.
   */
  const markVariantDirtyAction =
    /** @type {(allowEffects: import('../../../../types/allow-effects').AllowEffects, pageNumber: number, variantName: string) => Promise<boolean>} */ (
      (allowEffects, pageNumber, variantName) =>
        markVariantDirtyImpl(
          allowEffects,
          pageNumber,
          variantName,
          markVariantDirtyDeps
        )
    );
  const markAuthorDirtyAction =
    /** @type {(allowEffects: import('../../../../types/allow-effects').AllowEffects, authorId: string) => Promise<boolean>} */ (
      (allowEffects, authorId) =>
        markAuthorDirtyImpl(allowEffects, authorId, markVariantDirtyDeps)
    );

  const verifyAdmin = createVerifyAdmin({
    verifyToken: token =>
      /** @type {Promise<import('firebase-admin/auth').DecodedIdToken>} */ (
        auth.verifyIdToken(token)
      ),
    isAdminUid: createIsAdminUid(deps.ADMIN_UID),
    sendUnauthorized: (permission, res, message) =>
      sendResponse(permission, res, 401, 'send', message),
    sendForbidden: (permission, res) =>
      sendResponse(permission, res, 403, 'send', 'Forbidden'),
    logger: { warn: logWarning },
  });

  const coreHandleRequest = createHandleRequest(
    /**
    @type {{
    verifyAdmin: (permission: import('../../../../types/allow-effects').AllowEffects, req: import('../../../../types/native-http').NativeHttpRequest, res: import('../../../../types/native-http').NativeHttpResponse) => Promise<boolean>,
    markVariantDirty: (permission: import('../../../../types/allow-effects').AllowEffects, pageNumber: number, variantName: string) => Promise<boolean>,
    parseRequestBody: (body: unknown) => { pageNumber: number, variantName: string },
    allowedMethod: string,
    sendResponse: (permission: import('../../../../types/allow-effects').AllowEffects, res: import('../../../../types/native-http').NativeHttpResponse, status: number, method: 'send' | 'json', body: unknown) => void,
  }} */ ({
      verifyAdmin,
      markVariantDirty: markVariantDirtyAction,
      markAuthorDirty: markAuthorDirtyAction,
      sendResponse,
      parseRequestBody: parseMarkVariantRequestBody,
      // Stryker disable all -- the endpoint accepts only the fixed POST method.
      allowedMethod: 'POST',
    })
  );
  const runRequest =
    /** @type {(permission: import('../../../../types/allow-effects').AllowEffects, req: import('../../../../types/native-http').NativeHttpRequest, res: import('../../../../types/native-http').NativeHttpResponse) => Promise<void>} */ (
      (permission, req, res) => coreHandleRequest(permission, req, res)
    );
  const handleRequest = deps.bindEffectInvocationBoundary(runRequest);
  // Stryker restore all

  deps.bindStartupEffectBoundary(allowEffects =>
    deps.registerPostRoute(allowEffects, app, '/', handleRequest)
  );

  const markVariantDirty =
    /** @type {{ region: (name: string) => { https: { onRequest: (handler: unknown) => unknown } } }} */ (
      deps.functions
    )
      .region('europe-west1')
      .https.onRequest(app);

  return { markVariantDirty, handleRequest, app };
}
