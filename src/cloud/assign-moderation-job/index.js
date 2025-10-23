import * as functions from 'firebase-functions/v1';
import express from 'express';
import cors from 'cors';
import corsConfig from './cors-config.js';
import {
  createAssignModerationJob,
  createCorsOriginHandler,
  createSetupCors,
  configureUrlencodedBodyParser,
  setupAssignModerationJobRoute,
} from './core.js';
import * as gcf from './gcf.js';

const { db, auth, app } = gcf.initializeFirebaseAppResources();
const setupCors = createSetupCors(createCorsOriginHandler, cors);
setupCors(app, corsConfig);
configureUrlencodedBodyParser(app, express);

const firebaseResources = { db, auth, app };

setupAssignModerationJobRoute(firebaseResources, gcf);

export const assignModerationJob = createAssignModerationJob(
  functions,
  firebaseResources
);
