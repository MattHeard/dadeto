import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import { createAssignModerationWorkflow } from "./workflow.js";

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
  const { status, body } = await assignModerationWorkflow({ req });

  if (typeof body === "object") {
    res.status(status).json(body);
    return;
  }

  res.status(status).send(body);
}

/**
 * Build the payload persisted alongside a moderator assignment.
 * @param {unknown} variantRef Variant document reference selected for moderation.
 * @param {unknown} createdAt Firestore timestamp recorded for the assignment.
 * @returns {{ variant: unknown, createdAt: unknown }} Moderator assignment payload.
 */
function buildModeratorAssignment(variantRef, createdAt) {
  return {
    variant: variantRef,
    createdAt,
  };
}

/**
 * Select the first document from a snapshot when available.
 * @param {{ empty: boolean, docs?: unknown[] }} snapshot Query snapshot containing candidate documents.
 * @returns {{ variantDoc?: unknown, errorMessage?: string }} Selected document or an error message.
 */
function selectVariantDoc(snapshot) {
  const [variantDoc] = snapshot?.docs ?? [];
  if (!variantDoc || snapshot?.empty) {
    return { errorMessage: 'Variant fetch failed 🤷' };
  }

  return { variantDoc };
}

/**
 *
 * @param randomValue
 */
async function getVariantSnapshot(randomValue) {
  const zeroRatedForwardQuery = db
    .collectionGroup('variants')
    .where('moderatorReputationSum', '==', 0)
    .orderBy('rand', 'asc')
    .where('rand', '>=', randomValue)
    .limit(1);

  const zeroRatedForwardSnap = await zeroRatedForwardQuery.get();
  if (!zeroRatedForwardSnap.empty) {
    return zeroRatedForwardSnap;
  }

  const zeroRatedWraparoundQuery = db
    .collectionGroup('variants')
    .where('moderatorReputationSum', '==', 0)
    .orderBy('rand', 'asc')
    .where('rand', '<', randomValue)
    .limit(1);

  const zeroRatedWraparoundSnap = await zeroRatedWraparoundQuery.get();
  if (!zeroRatedWraparoundSnap.empty) {
    return zeroRatedWraparoundSnap;
  }

  const fallbackForwardQuery = db
    .collectionGroup('variants')
    .orderBy('rand', 'asc')
    .where('rand', '>=', randomValue)
    .limit(1);

  const fallbackForwardSnap = await fallbackForwardQuery.get();
  if (!fallbackForwardSnap.empty) {
    return fallbackForwardSnap;
  }

  const fallbackWraparoundQuery = db
    .collectionGroup('variants')
    .orderBy('rand', 'asc')
    .where('rand', '<', randomValue)
    .limit(1);

  return fallbackWraparoundQuery.get();
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

const assignModerationWorkflow = createAssignModerationWorkflow({
  runGuards,
  fetchVariantSnapshot: getVariantSnapshot,
  selectVariantDoc,
  buildAssignment: buildModeratorAssignment,
  createModeratorRef: (uid) => db.collection("moderators").doc(uid),
  now: () => FieldValue.serverTimestamp(),
  random: () => Math.random(),
});

app.post("/", handleAssignModerationJob);

export const assignModerationJob = functions
  .region('europe-west1')
  .https.onRequest(app);

export {
  handleAssignModerationJob,
  getIdTokenFromRequest,
  buildModeratorAssignment,
};
