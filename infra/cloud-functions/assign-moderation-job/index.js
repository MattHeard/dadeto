import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';

initializeApp();
const db = getFirestore();
const auth = getAuth();
const app = express();

const allowed = [
  'https://mattheard.net',
  'https://dendritestories.co.nz',
  'https://www.dendritestories.co.nz',
];
(function setupCors(appInstance, allowedOrigins) {
  appInstance.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) {
          cb(null, true);
        } else {
          cb(new Error('CORS'));
        }
      },
      methods: ['POST'],
    })
  );
})(app, allowed);

app.use(express.urlencoded({ extended: false }));

/**
 * Extract the ID token from a request body.
 * @param {import('express').Request} req HTTP request object.
 * @returns {string|undefined} The ID token if present.
 */
function getIdTokenFromRequest(req) {
  const { id_token: idToken } = req?.body ?? {};
  return idToken;
}

/**
 * Assign a random moderation job to the requesting user.
 * @param {import('express').Request} req HTTP request object.
 * @param {import('express').Response} res HTTP response object.
 * @returns {Promise<void>} Promise resolving when the response is sent.
 */
async function handleAssignModerationJob(req, res) {
  const guardResult = await runGuards({ req });

  if (guardResult.error) {
    res.status(guardResult.error.status).send(guardResult.error.body);
    return;
  }

  const { userRecord } = guardResult.context;

  const n = Math.random();

  // 1) zero-rated first
  let q = db
    .collectionGroup('variants')
    .where('moderatorReputationSum', '==', 0)
    .orderBy('rand', 'asc')
    .where('rand', '>=', n)
    .limit(1);

  let variantSnap = await q.get();

  if (variantSnap.empty) {
    q = db
      .collectionGroup('variants')
      .where('moderatorReputationSum', '==', 0)
      .orderBy('rand', 'asc')
      .where('rand', '<', n)
      .limit(1);
    variantSnap = await q.get();
  }

  // 2) fallback to any variant
  if (variantSnap.empty) {
    let q2 = db
      .collectionGroup('variants')
      .orderBy('rand', 'asc')
      .where('rand', '>=', n)
      .limit(1);
    let s2 = await q2.get();
    if (s2.empty) {
      q2 = db
        .collectionGroup('variants')
        .orderBy('rand', 'asc')
        .where('rand', '<', n)
        .limit(1);
      s2 = await q2.get();
    }
    variantSnap = s2;
  }

  if (variantSnap.empty) {
    res.status(500).send('Variant fetch failed 🤷');
    return;
  }

  const variantDoc = variantSnap.docs[0];

  const moderatorRef = db.collection('moderators').doc(userRecord.uid);
  await moderatorRef.set({
    variant: variantDoc.ref,
    createdAt: FieldValue.serverTimestamp(),
  });

  res.status(201).json({});
}

/**
 * @typedef {object} GuardError
 * @property {number} status HTTP status code to return.
 * @property {string} body Body payload describing the error.
 */

/**
 * @typedef {object} GuardSuccess
 * @property {object} [context] Additional context to merge into the chain state.
 */

/**
 * @typedef {{ error: GuardError } | GuardSuccess | void} GuardResult
 */

/**
 * @typedef {object} GuardContext
 * @property {import('express').Request} req Incoming HTTP request.
 * @property {string} [idToken] Extracted Firebase ID token.
 * @property {import('firebase-admin/auth').DecodedIdToken} [decoded] Verified Firebase token payload.
 * @property {import('firebase-admin/auth').UserRecord} [userRecord] Authenticated moderator record.
 */

/**
 * @callback GuardFunction
 * @param {GuardContext} context Current guard context.
 * @returns {Promise<GuardResult> | GuardResult} Guard evaluation outcome.
 */

/**
 * Compose a sequence of guard functions that short-circuit on failure.
 * @param {GuardFunction[]} guards Guard functions to execute in order.
 * @returns {(initialContext: GuardContext) => Promise<{ error?: GuardError, context?: GuardContext }>}
 * Guard chain executor that resolves with either the accumulated context or the failure details.
 */
function createGuardChain(guards) {
  return async function runChain(initialContext) {
    let context = initialContext;
    for (const guard of guards) {
      const result = await guard(context);
      if (result?.error) {
        return { error: result.error };
      }
      context = { ...context, ...(result?.context ?? {}) };
    }

    return { context };
  };
}

const ensurePostMethod = ({ req }) => {
  if (req.method === 'POST') {
    return {};
  }

  return {
    error: { status: 405, body: 'POST only' },
  };
};

const ensureIdTokenPresent = ({ req }) => {
  const idToken = getIdTokenFromRequest(req);
  if (idToken) {
    return { context: { idToken } };
  }

  return { error: { status: 400, body: 'Missing id_token' } };
};

const ensureValidIdToken = async ({ idToken }) => {
  try {
    const decoded = await auth.verifyIdToken(idToken);
    return { context: { decoded } };
  } catch (err) {
    return {
      error: {
        status: 401,
        body: err.message || 'Invalid or expired token',
      },
    };
  }
};

const ensureUserRecord = async ({ decoded }) => {
  try {
    const userRecord = await auth.getUser(decoded.uid);
    return { context: { userRecord } };
  } catch (err) {
    return {
      error: {
        status: 401,
        body: err.message || 'Invalid or expired token',
      },
    };
  }
};

const runGuards = createGuardChain([
  ensurePostMethod,
  ensureIdTokenPresent,
  ensureValidIdToken,
  ensureUserRecord,
]);

app.post('/', handleAssignModerationJob);

export const assignModerationJob = functions
  .region('europe-west1')
  .https.onRequest(app);

export { handleAssignModerationJob, getIdTokenFromRequest };
