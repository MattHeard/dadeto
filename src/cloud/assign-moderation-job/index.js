import * as functions from 'firebase-functions/v1';
import express from 'express';
import cors from 'cors';
import corsConfig from './cors-config.js';
import { createAssignModerationWorkflow } from './workflow.js';
import {
  getIdTokenFromRequest,
  selectVariantDoc,
  createHandleAssignModerationJob,
  createGetVariantSnapshot,
  buildAssignment,
  createRunGuards,
  createModeratorRefFactory,
  createFirebaseResources,
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

const getVariantSnapshot = createGetVariantSnapshot(runVariantQuery);

const runGuards = createRunGuards(auth);

const createModeratorRef = createModeratorRefFactory(db);

const assignModerationWorkflow = createAssignModerationWorkflow({
  runGuards,
  fetchVariantSnapshot: getVariantSnapshot,
  selectVariantDoc,
  buildAssignment,
  createModeratorRef,
  now,
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
