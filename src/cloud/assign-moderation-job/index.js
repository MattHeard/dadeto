import * as functions from 'firebase-functions/v1';
import express from 'express';
import cors from 'cors';
import corsConfig from './cors-config.js';
import {
  getIdTokenFromRequest,
  createFirebaseResources,
  random,
  createHandleAssignModerationJob,
} from './core.js';
import {
  initializeFirebaseAppResources,
  createRunVariantQuery,
  now,
} from './gcf.js';

const firebaseResources = createFirebaseResources(
  initializeFirebaseAppResources,
  cors,
  corsConfig,
  express
);

const { app } = firebaseResources;

const handleAssignModerationJob = registerAssignModerationJobRoute(
  firebaseResources,
  createRunVariantQuery,
  now,
  random
);

function registerAssignModerationJobRoute(
  firebaseResources,
  createRunVariantQuery,
  now,
  random
) {
  const { db, auth, app } = firebaseResources;

  const handleAssignModerationJob = createHandleAssignModerationJob(
    createRunVariantQuery,
    auth,
    db,
    now,
    random
  );

  app.post('/', handleAssignModerationJob);

  return handleAssignModerationJob;
}

export const assignModerationJob = functions
  .region('europe-west1')
  .https.onRequest(app);

export { handleAssignModerationJob, getIdTokenFromRequest };
