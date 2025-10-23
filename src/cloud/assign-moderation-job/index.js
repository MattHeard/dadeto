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
 * Compose the helper that builds the CORS origin handler from environment variables.
 * @param {typeof createCreateCorsOrigin} createCreateCorsOriginFn Factory that wires the origin handler dependencies.
 * @param {typeof createCorsOriginHandler} createCorsOriginHandlerFn Function that creates the CORS origin handler.
 * @returns {(
 *   getAllowedOriginsFn: (environmentVariables: Record<string, string | undefined>) => string[],
 *   getEnvironmentVariablesFn: () => Record<string, string | undefined>
 * ) => (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void}
 * Factory that resolves a configured CORS origin handler from environment helpers.
 */
function createCreateCorsOriginFromEnvironment(
  createCreateCorsOriginFn,
  createCorsOriginHandlerFn
) {
  return function createCorsOriginFromEnvironment(
    getAllowedOriginsFn,
    getEnvironmentVariablesFn
  ) {
    const createCorsOrigin = createCreateCorsOriginFn({
      getAllowedOrigins: getAllowedOriginsFn,
      createCorsOriginHandler: createCorsOriginHandlerFn,
    });

    return createCorsOrigin(getEnvironmentVariablesFn);
  };
}

const createCorsOriginFromEnvironment = createCreateCorsOriginFromEnvironment(
  createCreateCorsOrigin,
  createCorsOriginHandler
);

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
