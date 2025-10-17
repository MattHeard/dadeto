import * as functions from 'firebase-functions/v1';
import express from 'express';
import cors from 'cors';
import corsConfig from './cors-config.js';
import {
  getIdTokenFromRequest,
  createFetchVariantSnapshot,
  createFirebaseResources,
  random,
  createHandleAssignModerationJobFromAuth,
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

const { db, auth, app } = firebaseResources;

const runVariantQuery = createRunVariantQuery(db);

const fetchVariantSnapshot = createFetchVariantSnapshot(runVariantQuery);

const handleAssignModerationJob = createHandleAssignModerationJobFromAuth(
  auth,
  fetchVariantSnapshot,
  db,
  now,
  random
);

app.post('/', handleAssignModerationJob);

export const assignModerationJob = functions
  .region('europe-west1')
  .https.onRequest(app);

export { handleAssignModerationJob, getIdTokenFromRequest };
