import * as functions from 'firebase-functions/v1';
import express from 'express';
import cors from 'cors';
import corsConfig from './cors-config.js';
import {
  createAssignModerationJob,
  createFirebaseResources,
  random,
  registerAssignModerationJobRoute,
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

const registerAssignModerationJobRouteHandler = (
  firebaseResourcesArg,
  createRunVariantQueryArg,
  nowArg
) =>
  registerAssignModerationJobRoute(
    firebaseResourcesArg,
    createRunVariantQueryArg,
    nowArg,
    random
  );

registerAssignModerationJobRouteHandler(
  firebaseResources,
  createRunVariantQuery,
  now
);

export const assignModerationJob = createAssignModerationJob(functions, app);

