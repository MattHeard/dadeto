import * as functions from 'firebase-functions/v1';
import express from 'express';
import cors from 'cors';
import corsConfig from './cors-config.js';
import {
  createAssignModerationJob,
  createFirebaseResources,
  setupAssignModerationJobRoute,
} from './core.js';
import * as gcf from './gcf.js';

const firebaseResources = createFirebaseResources(
  gcf.initializeFirebaseAppResources,
  cors,
  corsConfig,
  express
);

setupAssignModerationJobRoute(firebaseResources, gcf);

export const assignModerationJob = createAssignModerationJob(
  functions,
  firebaseResources
);

