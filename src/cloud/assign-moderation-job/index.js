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
  createGetVariantSnapshot,
  createGuardChain,
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

const getVariantSnapshot = createGetVariantSnapshot(runVariantQuery);

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
