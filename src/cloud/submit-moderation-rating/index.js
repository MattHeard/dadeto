import { initializeApp } from 'firebase-admin/app';
import {
  functions,
  express,
  cors,
  getAuth,
  FieldValue,
  createFirebaseAppManager,
  getFirestoreInstance,
  crypto,
  getEnvironmentVariables,
} from './submit-moderation-rating-gcf.js';
import { runSubmitModerationRating } from '../../core/cloud/submit-moderation-rating/run.js';

const { submitModerationRating: handle } = runSubmitModerationRating({
  functions,
  express,
  cors,
  getAuth,
  FieldValue,
  createFirebaseAppManager,
  getFirestoreInstance,
  crypto,
  getEnvironmentVariables,
  initializeApp,
});

export { handle };
