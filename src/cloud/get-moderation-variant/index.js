import { initializeApp } from 'firebase-admin/app';
import {
  functions,
  express,
  cors,
  getAuth,
  getEnvironmentVariables,
} from './get-moderation-variant-gcf.js';
import { createFirebaseAppManager } from './common-gcf.js';
import { getFirestoreInstance } from './firestore.js';
import {
  createCorsOptions,
  createGetModerationVariantResponder,
  createHandleCorsOrigin,
  getAllowedOrigins,
  isAllowedOrigin,
} from './get-moderation-variant-core.js';

const { ensureFirebaseApp } = createFirebaseAppManager(initializeApp);

const db = getFirestoreInstance();
ensureFirebaseApp();
const auth = getAuth();
const app = express();

const environmentVariables = getEnvironmentVariables();
const allowedOrigins = getAllowedOrigins(environmentVariables);
const handleCorsOrigin = createHandleCorsOrigin(
  isAllowedOrigin,
  allowedOrigins
);
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

/**
 * Handle the HTTP request to fetch the moderation variant for the authenticated user.
 * @param {import('express').Request} req Incoming HTTP request.
 * @param {import('express').Response} res HTTP response used to send the variant payload.
 * @returns {Promise<void>} Promise that resolves once the response has been sent.
 */
async function handleGetModerationVariant(req, res) {
  try {
    const { status, body } = await getModerationVariantResponse(req);

    if (body && typeof body === 'object' && !Array.isArray(body)) {
      res.status(status).json(body);
      return;
    }

    res.status(status).send(body);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send(`get-moderation-variant failed: ${formatErrorMessage(error)}`);
  }
}

/**
 * Handle middleware failures with a useful diagnostic body.
 * @param {unknown} error Middleware error.
 * @param {import('express').Request} _req Incoming HTTP request.
 * @param {import('express').Response} res HTTP response.
 * @param {import('express').NextFunction} _next Express next callback.
 * @returns {void}
 */
function handleGetModerationVariantMiddlewareError(error, _req, res, _next) {
  console.error(error);
  if (res.headersSent) {
    return;
  }

  res
    .status(500)
    .send(`get-moderation-variant middleware failed: ${formatErrorMessage(error)}`);
}

app.get('/', handleGetModerationVariant);
app.use(handleGetModerationVariantMiddlewareError);

/**
 * Safely format an error message for cloud diagnostics.
 * @param {unknown} error Error-like value.
 * @returns {string} Sanitized error message.
 */
function formatErrorMessage(error) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(/** @type {{ message: unknown }} */ (error).message).slice(
      0,
      300
    );
  }

  return String(error).slice(0, 300);
}

export const getModerationVariant = functions
  .region('europe-west1')
  .https.onRequest(app);

export { handleGetModerationVariant };
