import { initializeApp } from 'firebase-admin/app';
import {
  functions,
  FieldValue,
  getAuth,
  express,
  cors,
  crypto,
  createFirebaseAppManager,
  getFirestoreInstance,
  getEnvironmentVariables,
} from './submit-new-story-gcf.js';
import { getAllowedOrigins } from './cors-config.js';
import { runSubmitNewStory } from '../../core/cloud/submit-new-story/run.js';

const environmentDependencies = {
  initializeApp,
  createFirebaseAppManager,
  getFirestoreInstance,
  getAuth,
  express,
  cors,
  crypto,
  FieldValue,
  functions,
  getEnvironmentVariables,
  getAllowedOrigins,
};

const { submitNewStory: handle } = runSubmitNewStory(environmentDependencies);

export { handle };
