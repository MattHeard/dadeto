import { initializeApp } from 'firebase-admin/app';
import { functions, express, cors, getAuth, getEnvironmentVariables } from './get-moderation-variant-gcf.js';
import { createFirebaseAppManager } from './common-gcf.js';
import { getFirestoreInstance } from './firestore.js';
import { createCorsOptions, createGetModerationVariantResponder, createHandleCorsOrigin, getAllowedOrigins, isAllowedOrigin } from './get-moderation-variant-core.js';

const { ensureFirebaseApp } = createFirebaseAppManager(initializeApp);
const db = getFirestoreInstance();
ensureFirebaseApp();
const auth = getAuth(), app = express(), environmentVariables = getEnvironmentVariables(), allowedOrigins = getAllowedOrigins(environmentVariables);
app.use(cors(createCorsOptions(createHandleCorsOrigin(isAllowedOrigin, allowedOrigins))));

const getModerationVariantResponse = createGetModerationVariantResponder({ db, auth });
async function handleGetModerationVariant(req, res) {
  try {
    const { status, body } = await getModerationVariantResponse(req);
    if (body && typeof body === 'object' && !Array.isArray(body)) return res.status(status).json(body);
    res.status(status).send(body);
  } catch (error) {
    console.error(error);
    res.status(500).send(`get-moderation-variant failed: ${formatErrorMessage(error)}`);
  }
}

function handleGetModerationVariantMiddlewareError(error, _req, res) {
  console.error(error);
  if (!res.headersSent) res.status(500).send(`get-moderation-variant middleware failed: ${formatErrorMessage(error)}`);
}

function formatErrorMessage(error) {
  return String(error && typeof error === 'object' && 'message' in error ? /** @type {{ message: unknown }} */ (error).message : error).slice(0, 300);
}

app.get('/', handleGetModerationVariant);
app.use(handleGetModerationVariantMiddlewareError);

export const handle = functions.region('europe-west1').https.onRequest(app);
export { handleGetModerationVariant };
