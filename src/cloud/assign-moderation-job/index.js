import * as functions from 'firebase-functions/v1';
import express from 'express';
import cors from 'cors';
import { getAllowedOrigins } from './cors-config.js';
import {
  createAssignModerationJob,
  createCreateCorsOrigin,
  createCorsOriginHandler,
  configureUrlencodedBodyParser,
  setupAssignModerationJobRoute,
} from './core.js';
import * as gcf from './gcf.js';

const { db, auth, app } = gcf.initializeFirebaseAppResources();

/**
 * Build the CORS origin handler using environment variables.
 * @param {(environmentVariables: Record<string, string | undefined>) => string[]} getAllowedOriginsFn
 * Function that resolves the allowed origins list from environment variables.
 * @param {() => Record<string, string | undefined>} getEnvironmentVariablesFn Function that retrieves
 * the environment variables exposed to the Cloud Function.
 * @returns {(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void}
 * Configured origin handler consumed by the CORS middleware.
 */
function createCorsOriginFromEnvironment(
  getAllowedOriginsFn,
  getEnvironmentVariablesFn
) {
  const createCorsOrigin = createCreateCorsOrigin({
    getAllowedOrigins: getAllowedOriginsFn,
    createCorsOriginHandler,
  });

  return createCorsOrigin(getEnvironmentVariablesFn);
}

const corsOptions = {
  origin: createCorsOriginFromEnvironment(
    getAllowedOrigins,
    gcf.getEnvironmentVariables
  ),
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
