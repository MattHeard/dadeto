import { initializeApp } from 'firebase-admin/app';
import {
  ADMIN_UID,
  createFirebaseAppManager,
  cors,
  express,
  functions,
  getAuth,
  getEnvironmentVariables,
  getFirestoreInstance,
} from './mark-variant-dirty-gcf.js';
import { runMarkVariantDirty } from '../../core/cloud/mark-variant-dirty/run.js';
import {
  createEffectInvocationBoundary,
  createEffectStartupBoundary,
  logDebugEffect,
} from '../allow-effects.js';
import {
  initializeFirebaseApp,
  registerPostRoute,
  updateDocument,
  useMiddleware,
} from './effect-adapters.js';
import { sendHttpResponse } from './response-adapter.js';
import { logWarning } from './logging-adapter.js';

const { markVariantDirty: handle, handleRequest } = runMarkVariantDirty({
  initializeApp,
  createFirebaseAppManager,
  getFirestoreInstance,
  getAuth,
  express,
  cors,
  functions,
  getEnvironmentVariables,
  bindStartupEffectBoundary: createEffectStartupBoundary,
  bindEffectInvocationBoundary: createEffectInvocationBoundary,
  initializeFirebaseApp,
  registerPostRoute,
  sendResponse: sendHttpResponse,
  useMiddleware,
  updateDocument,
  logWarning,
  logDebug: logDebugEffect,
  ADMIN_UID,
});

export { handle, handleRequest };
export { findVariantRef, markVariantDirtyImpl } from './mark-variant-dirty-core.js';
