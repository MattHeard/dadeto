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
import {
  createAssignModerationJobEntrypoint,
} from '../../core/cloud/assign-moderation-job/index.js';
import { createAllowEffects } from '../allow-effects.js';
import { useMiddleware } from './effect-adapters.js';

const entrypoint = createAssignModerationJobEntrypoint({
  functions,
  express,
  cors,
  initializeApp,
  getAuth,
  getFirestore: getAdminFirestore,
  getEnvironmentVariables,
  now,
  random: Math.random,
  bindEffectBoundary: handler => handler(createAllowEffects()),
  useMiddleware,
});

export const handle = entrypoint.handle;
export const testing = entrypoint.testing;
