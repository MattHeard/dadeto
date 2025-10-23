import * as functions from 'firebase-functions/v1';
import express from 'express';
import cors from 'cors';
import { getAllowedOrigins } from './cors-config.js';
import {
  createAssignModerationJob,
  createCreateCorsOrigin,
  createCorsOriginFromEnvironment,
  createCorsOriginHandler,
  configureUrlencodedBodyParser,
  setupAssignModerationJobRoute,
} from './core.js';
import * as gcf from './gcf.js';

const { db, auth, app } = gcf.initializeFirebaseAppResources();

const corsOptions = {
  origin: createCorsOriginFromEnvironment({
    getAllowedOrigins,
    getEnvironmentVariables: gcf.getEnvironmentVariables,
    createCreateCorsOrigin,
    createCorsOriginHandler,
  }),
  methods: ['POST'],
};

app.use(cors(corsOptions));
configureUrlencodedBodyParser(app, express);

const firebaseResources = { db, auth, app };

setupAssignModerationJobRoute(firebaseResources, gcf);

export const assignModerationJob = createAssignModerationJob(
  functions,
  firebaseResources
);
