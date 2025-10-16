import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';
import express from 'express';
import cors from 'cors';
import corsConfig from './cors-config.js';
import { createAssignModerationWorkflow } from './workflow.js';
import {
  createAssignModerationApp,
  configureUrlencodedBodyParser,
  getIdTokenFromRequest,
  selectVariantDoc,
  createHandleAssignModerationJob,
  createVariantSnapshotFetcher,
} from './core.js';
import {
  initializeFirebaseAppResources,
  createRunVariantQuery,
} from './gcf.js';

const { allowedOrigins } = corsConfig;

const firebaseResources = createAssignModerationApp(
  initializeFirebaseAppResources,
  cors,
  allowedOrigins,
  configureUrlencodedBodyParser,
  express
);

const { db, auth, app } = firebaseResources;

const runVariantQuery = createRunVariantQuery(db);

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

const handleAssignModerationJob = createHandleAssignModerationJob(
  assignModerationWorkflow
);

app.post('/', handleAssignModerationJob);

export const assignModerationJob = functions
  .region('europe-west1')
  .https.onRequest(app);

export { handleAssignModerationJob, getIdTokenFromRequest };
