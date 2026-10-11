import {
  functions,
  express,
  cors,
  initializeApp,
  getAuth,
  getFirestore as getAdminFirestore,
  getEnvironmentVariables,
  now,
} from './assign-moderation-job-gcf.js';
import { createAssignModerationJobEntrypoint } from '../../core/cloud/assign-moderation-job/index.js';
import { createAllowEffects, logDebugEffect } from '../allow-effects.js';
import {
  createSetModeratorAssignment,
  initializeFirebaseApp,
} from './effect-adapters.js';
import {
  registerPostRoute,
  sendHttpResponse,
  useMiddleware,
} from './assign-moderation-job-core.js';

const entrypoint = await createAssignModerationJobEntrypoint({
  functions,
  express,
  cors,
  initializeApp,
  initializeFirebaseApp,
  getAuth,
  getFirestore: getAdminFirestore,
  getEnvironmentVariables,
  now,
  random: Math.random,
  bindEffectBoundary: handler => handler(createAllowEffects()),
  useMiddleware,
  registerPostRoute,
  createSetModeratorAssignment,
  sendHttpResponse,
  logDebug: logDebugEffect,
});

export const handle = entrypoint.handle;
export const testing = entrypoint.testing;
