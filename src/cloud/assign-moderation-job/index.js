import * as functions from 'firebase-functions/v1';
import express from 'express';
import cors from 'cors';
import corsConfig from './cors-config.js';
import {
  getIdTokenFromRequest,
  createFirebaseResources,
  random,
  createFetchVariantSnapshotFromDbFactory,
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

const createFetchVariantSnapshotFromDb = createFetchVariantSnapshotFromDbFactory(
  createRunVariantQuery
);

const fetchVariantSnapshot = createFetchVariantSnapshotFromDb(db);

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
