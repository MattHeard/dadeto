import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import { createAssignModerationWorkflow } from './workflow.js';
import { createVariantSnapshotFetcher } from './variant-selection.js';
import {
  createAssignModerationApp,
  isAllowedOrigin,
  configureUrlencodedBodyParser,
  getIdTokenFromRequest,
  selectVariantDoc,
} from './core.js';
import { initializeFirebaseAppResources } from './gcf.js';

/**
 * Configure CORS middleware for the moderation Express app.
 * @param {import('express').Express} appInstance Express application instance.
 * @param {string[]} allowedOrigins Origins permitted to call the endpoint.
 * @returns {void}
 */
function setupCors(appInstance, allowedOrigins) {
  appInstance.use(
    cors({
      origin: (origin, cb) => {
        if (isAllowedOrigin(origin, allowedOrigins)) {
          cb(null, true);
          return;
        }

        cb(new Error('CORS'));
      },
      methods: ['POST'],
    })
  );
}

/**
 * Determine whether a request origin is allowed.
 * @param {string | undefined} origin Request origin header.
 * @param {string[]} allowedOrigins Whitelisted origins.
 * @returns {boolean} True when the origin should be allowed.
 */
const allowed = [
  'https://mattheard.net',
  'https://dendritestories.co.nz',
  'https://www.dendritestories.co.nz',
];

const firebaseResources = createAssignModerationApp(
  initializeFirebaseAppResources,
  setupCors,
  allowed,
  (appInstance) => configureUrlencodedBodyParser(appInstance, express)
);

const { db, auth, app } = firebaseResources;

/**
 * Assign a random moderation job to the requesting user.
 * @param {import('express').Request} req HTTP request object.
 * @param {import('express').Response} res HTTP response object.
 * @returns {Promise<void>} Promise resolving when the response is sent.
 */
async function handleAssignModerationJob(req, res) {
  const { status, body } = await assignModerationWorkflow({ req });

  res.status(status).send(body ?? '');
}

const runVariantQuery = ({ reputation, comparator, randomValue }) => {
  let query = db.collectionGroup('variants');

  if (reputation === 'zeroRated') {
    query = query.where('moderatorReputationSum', '==', 0);
  }

  query = query
    .orderBy('rand', 'asc')
    .where('rand', comparator, randomValue)
    .limit(1);

  return query.get();
};

const getVariantSnapshot = createVariantSnapshotFetcher({
  runQuery: runVariantQuery,
});

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

const assignModerationWorkflow = createAssignModerationWorkflow({
  runGuards,
  fetchVariantSnapshot: getVariantSnapshot,
  selectVariantDoc,
  buildAssignment: (variantRef, createdAt) => ({
    variant: variantRef,
    createdAt,
  }),
  createModeratorRef: uid => db.collection('moderators').doc(uid),
  now: () => FieldValue.serverTimestamp(),
  random: () => Math.random(),
});

app.post('/', handleAssignModerationJob);

export const assignModerationJob = functions
  .region('europe-west1')
  .https.onRequest(app);

export {
  handleAssignModerationJob,
  getIdTokenFromRequest,
};
