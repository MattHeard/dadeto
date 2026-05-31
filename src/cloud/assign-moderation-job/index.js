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

const entrypoint = createAssignModerationJobEntrypoint({
  functions,
  express,
  cors,
  initializeApp,
  getAuth,
  getFirestore: getAdminFirestore,
  getEnvironmentVariables,
  now,
});

export const handle = entrypoint.handle;
export const testing = entrypoint.testing;
