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
  sendForbidden,
  sendUnauthorized,
} from './mark-variant-dirty-core.js';
import { createVerifyAdmin, isAllowedOrigin } from '../cloud-core.js';
import { createFirebaseAppContext } from '../firebase-app-manager.js';

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
 *   ADMIN_UID: string,
 * }} deps Dependencies required to compose the mark-variant-dirty endpoint.
 * @returns {{ markVariantDirty: unknown, handleRequest: Function, app: unknown }} Wired cloud export objects for index.js.
 */
export function runMarkVariantDirty(deps) {
  const { auth, db, app } = /**
     @type {{
    auth: { verifyIdToken: (token: string) => Promise<unknown> },
    db: import('firebase-admin/firestore').Firestore,
    app: {
      use: (...args: unknown[]) => unknown,
      post: (path: string, handler: unknown) => unknown,
    },
  }} */ (createFirebaseAppContext(deps));

  const environmentVariables = deps.getEnvironmentVariables();
  const allowedOrigins = getAllowedOrigins(environmentVariables);
  const handleCorsOrigin = createHandleCorsOrigin(
    isAllowedOrigin,
    allowedOrigins
  );
  const corsOptions = createCorsOptions(handleCorsOrigin, ['POST']);

  app.use(deps.cors(corsOptions));
  const jsonMiddleware = deps.express.json();
  app.use(jsonMiddleware);

  const markVariantDirtyDeps = {
    db,
    firebase: {
      findPageRef,
      findPagesSnap,
      findVariantsSnap,
      refFromSnap,
    },
  };

  /**
   * @param {number} pageNumber Page number.
   * @param {string} variantName Variant name.
   * @returns {Promise<boolean>} Result.
   */
  const markVariantDirtyAction = (pageNumber, variantName) =>
    markVariantDirtyImpl(pageNumber, variantName, markVariantDirtyDeps);
  const markAuthorDirtyAction = (/** @type {string} */ authorId) =>
    markAuthorDirtyImpl(authorId, markVariantDirtyDeps);

  const verifyAdmin = createVerifyAdmin({
    verifyToken: token =>
      /** @type {Promise<import('firebase-admin/auth').DecodedIdToken>} */ (
        auth.verifyIdToken(token)
      ),
    isAdminUid: createIsAdminUid(deps.ADMIN_UID),
    sendUnauthorized,
    sendForbidden,
  });

  const handleRequest = createHandleRequest(
    /**
     @type {{
    verifyAdmin: (req: import('../../../../types/native-http').NativeHttpRequest, res: import('../../../../types/native-http').NativeHttpResponse) => Promise<boolean>,
    markVariantDirty: (pageNumber: number, variantName: string) => Promise<boolean>,
    parseRequestBody: (body: unknown) => { pageNumber: number, variantName: string },
    allowedMethod: string,
  }} */ ({
      verifyAdmin,
      markVariantDirty: markVariantDirtyAction,
      markAuthorDirty: markAuthorDirtyAction,
      parseRequestBody: parseMarkVariantRequestBody,
      allowedMethod: 'POST',
    })
  );

  app.post('/', handleRequest);

  const markVariantDirty =
    /** @type {{ region: (name: string) => { https: { onRequest: (handler: unknown) => unknown } } }} */ (
      deps.functions
    )
      .region('europe-west1')
      .https.onRequest(app);

  return { markVariantDirty, handleRequest, app };
}
/* istanbul ignore file -- cloud wiring is exercised by deployed tests. */
