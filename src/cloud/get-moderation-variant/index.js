import {
  functions,
  express,
  cors,
  getAuth,
  getEnvironmentVariables,
} from './get-moderation-variant-gcf.js';
import { ensureFirebaseApp } from './firebaseApp.js';
import { getFirestoreInstance } from './firestore.js';
import {
  createCorsOptions,
  createGetModerationVariantResponder,
  createHandleCorsOrigin,
  getAllowedOrigins,
  isAllowedOrigin,
} from './get-moderation-variant-core.js';

const db = getFirestoreInstance();
ensureFirebaseApp();
const auth = getAuth();
const app = express();

const environmentVariables = getEnvironmentVariables();
const allowedOrigins = getAllowedOrigins(environmentVariables);
const handleCorsOrigin = createHandleCorsOrigin(isAllowedOrigin, allowedOrigins);
const corsOptions = createCorsOptions(handleCorsOrigin);

app.use(cors(corsOptions));

/**
 * Fetch the variant assigned to the authenticated moderator.
 * @param {import('express').Request} req HTTP request object.
 * @param {import('express').Response} res HTTP response object.
 * @returns {Promise<void>} Promise resolving when the response is sent.
 */
const getModerationVariantResponse = createGetModerationVariantResponder({
  db,
  auth,
});

async function handleGetModerationVariant(req, res) {
  const { status, body } = await getModerationVariantResponse(req);

  if (body && typeof body === 'object' && !Array.isArray(body)) {
    res.status(status).json(body);
    return;
  }

  res.status(status).send(body);
}

app.get('/', handleGetModerationVariant);

export const getModerationVariant = functions
  .region('europe-west1')
  .https.onRequest(app);

export { handleGetModerationVariant };
