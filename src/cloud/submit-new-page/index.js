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
} from './submit-new-page-gcf.js';
import { getAllowedOrigins } from './cors-config.js';
import {
  createHandleSubmit,
  createSubmitNewPageApp,
  createSubmitNewPageRequestHandler,
} from './submit-new-page-core.js';
import { createEffectHttpBoundary } from '../allow-effects.js';
import { createSubmitNewPageRuntime } from './runtime.js';
import {
  parseIncomingOption,
  findExistingOption,
  findExistingPage,
} from './helpers.js';
import { initializeApp } from 'firebase-admin/app';

const handleSubmitCore = createSubmitNewPageRuntime({
  createHandleSubmit,
  createFirebaseAppManager,
  initializeApp,
  getFirestoreInstance,
  getAuth,
  crypto,
  FieldValue,
  parseIncomingOption,
  findExistingOption,
  findExistingPage,
});
const app = createSubmitNewPageApp({
  express,
  cors,
  allowedOrigins: getAllowedOrigins(getEnvironmentVariables()),
  handleSubmit: createSubmitNewPageRequestHandler(
    handleSubmitCore,
    createEffectHttpBoundary
  ),
});

export const handle = functions.region('europe-west1').https.onRequest(app);
