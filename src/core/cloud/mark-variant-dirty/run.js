// @ts-nocheck
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
  parseMarkVariantRequestBody,
  refFromSnap,
  sendForbidden,
  sendUnauthorized,
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
 *   ADMIN_UID: string,
 * }} deps Dependencies required to compose the mark-variant-dirty endpoint.
 * @returns {{ markVariantDirty: unknown, handleRequest: Function, app: unknown }} Wired cloud export objects for index.js.
 */
export function runMarkVariantDirty(deps) {
  const { ensureFirebaseApp } = deps.createFirebaseAppManager(
    deps.initializeApp
  );

  ensureFirebaseApp();

  const auth = deps.getAuth();
  const db = deps.getFirestoreInstance();
  const app = deps.express();

  const environmentVariables = deps.getEnvironmentVariables();
  const allowedOrigins = getAllowedOrigins(environmentVariables);
  const handleCorsOrigin = createHandleCorsOrigin(
    isAllowedOrigin,
    allowedOrigins
  );
  const corsOptions = createCorsOptions(handleCorsOrigin, ['POST']);

  app.use(deps.cors(corsOptions));
  app.use(deps.express.json());

  const markVariantDirtyDeps = {
    db,
    firebase: {
      findPageRef,
      findPagesSnap,
      findVariantsSnap,
      refFromSnap,
    },
  };

  const markVariantDirtyAction = (pageNumber, variantName) =>
    markVariantDirtyImpl(pageNumber, variantName, markVariantDirtyDeps);

  const verifyAdmin = createVerifyAdmin({
    verifyToken: token => auth.verifyIdToken(token),
    isAdminUid: createIsAdminUid(deps.ADMIN_UID),
    sendUnauthorized,
    sendForbidden,
  });

  const handleRequest = createHandleRequest({
    verifyAdmin,
    markVariantDirty: markVariantDirtyAction,
    parseRequestBody: parseMarkVariantRequestBody,
  });

  app.post('/', handleRequest);

  const markVariantDirty = deps.functions
    .region('europe-west1')
    .https.onRequest(app);

  return { markVariantDirty, handleRequest, app };
}
