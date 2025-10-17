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
  ensurePostMethod,
  ensureIdTokenPresent,
  createEnsureValidIdToken,
  createEnsureUserRecord,
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

const ensureValidIdToken = createEnsureValidIdToken(auth);

const ensureUserRecord = createEnsureUserRecord(auth);

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
