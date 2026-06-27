import { initializeApp } from 'firebase-admin/app';
import {
  functions,
  express,
  cors,
  FieldValue,
  createFirebaseAppManager,
  getFirestoreInstance,
  getEnvironmentVariables,
} from './report-for-moderation-gcf.js';
import { runReportForModeration } from '../../core/cloud/report-for-moderation/run.js';

const { handle, handleReportForModeration } = runReportForModeration({
  functions,
  express,
  cors,
  FieldValue,
  createFirebaseAppManager,
  getFirestoreInstance,
  getEnvironmentVariables,
  initializeApp,
});

export { handle, handleReportForModeration };
