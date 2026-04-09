import { initializeApp } from 'firebase-admin/app';
import {
  functions,
  express,
  cors,
  getAuth,
  createFirebaseAppManager,
  getFirestoreInstance,
  getEnvironmentVariables,
  ADMIN_UID,
} from './mark-variant-dirty-gcf.js';
import {
  createHandleCorsOrigin,
  createHandleRequest,
  createIsAdminUid,
  createCorsOptions,
  findPageRef,
  findPagesSnap,
  findVariantsSnap,
  findVariantRef,
  getAllowedOrigins,
  markVariantDirtyImpl,
  parseMarkVariantRequestBody,
  refFromSnap,
  sendForbidden,
  sendUnauthorized,
} from './mark-variant-dirty-core.js';
import { createVerifyAdmin, isAllowedOrigin } from './cloud-core.js';

/**
 * @typedef {object} MarkVariantDirtyDeps
 * @property {import('firebase-admin/firestore').Firestore} db Firestore instance.
 * @property {object} firebase Firebase helper overrides.
 * @property {typeof findPageRef} firebase.findPageRef Helper to find the page reference.
 * @property {typeof findPagesSnap} firebase.findPagesSnap Helper to read the page snapshot.
 * @property {typeof findVariantsSnap} firebase.findVariantsSnap Helper to read the variant snapshot.
 * @property {typeof refFromSnap} firebase.refFromSnap Helper to extract a document ref from a snapshot.
 */

const { ensureFirebaseApp } = createFirebaseAppManager(initializeApp);

ensureFirebaseApp();

const auth = getAuth();
const db = getFirestoreInstance();
const app = express();

const environmentVariables = getEnvironmentVariables();
const allowedOrigins = getAllowedOrigins(environmentVariables);
const handleCorsOrigin = createHandleCorsOrigin(
  isAllowedOrigin,
  allowedOrigins
);
const corsOptions = createCorsOptions(handleCorsOrigin, ['POST']);

app.use(cors(corsOptions));
app.use(express.json());

/** @type {MarkVariantDirtyDeps} */
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
  isAdminUid: createIsAdminUid(ADMIN_UID),
  sendUnauthorized,
  sendForbidden,
});

const handleRequest = createHandleRequest({
  verifyAdmin,
  markVariantDirty: markVariantDirtyAction,
  parseRequestBody: parseMarkVariantRequestBody,
});

app.post('/', (req, res) => handleRequest(req, res));

export const markVariantDirty = functions
  .region('europe-west1')
  .https.onRequest(app);

export { handleRequest, markVariantDirtyImpl, findVariantRef };
