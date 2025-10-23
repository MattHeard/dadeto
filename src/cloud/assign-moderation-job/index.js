import * as functions from 'firebase-functions/v1';
import express from 'express';
import cors from 'cors';
import { getAllowedOrigins } from './cors-config.js';
import {
  createAssignModerationJob,
  createCorsOriginHandler,
  createCorsOriginFactory,
  configureUrlencodedBodyParser,
  setupAssignModerationJobRoute,
} from './core.js';
import * as gcf from './gcf.js';

const { db, auth, app } = gcf.initializeFirebaseAppResources();

const createCreateCorsOrigin = allowedOriginsFetcher =>
  createCorsOriginFactory({
    getAllowedOrigins: allowedOriginsFetcher,
    createCorsOriginHandler,
  });

const createCorsOrigin = createCreateCorsOrigin(getAllowedOrigins);

const corsOptions = {
  origin: createCorsOrigin(gcf.getEnvironmentVariables),
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
