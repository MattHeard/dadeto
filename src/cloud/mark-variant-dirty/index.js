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
  isAllowedOrigin,
  markVariantDirtyImpl,
  parseMarkVariantRequestBody,
  refFromSnap,
  sendForbidden,
  sendUnauthorized,
} from './mark-variant-dirty-core.js';
import { createVerifyAdmin } from './cloud-core.js';

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

const markVariantDirtyAction = (pageNumber, variantName) =>
  markVariantDirtyImpl(pageNumber, variantName, {
    db,
    firebase: {
      findPageRef,
      findPagesSnap,
      findVariantsSnap,
      refFromSnap,
    },
  });

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
