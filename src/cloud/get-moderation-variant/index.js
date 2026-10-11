import { initializeApp } from 'firebase-admin/app';
import {
  functions,
  express,
  cors,
  getAuth,
  getEnvironmentVariables,
} from './get-moderation-variant-gcf.js';
import { createFirebaseAppManager } from './common-gcf.js';
import { getFirestoreInstance } from './firestore.js';
import {
  createEffectHttpBoundary,
  createEffectInvocationBoundary,
  createEffectStartupBoundary,
  logDebugEffect,
} from '../allow-effects.js';
import { runGetModerationVariant } from '../../core/cloud/get-moderation-variant/run.js';
import {
  initializeFirebaseApp,
  registerGetRoute,
  useMiddleware,
} from './startup-effect-adapters.js';
import {
  logError,
  sendHttpResponse,
  sendJsonResponse,
} from './request-effect-adapters.js';
const runtime = runGetModerationVariant({
  functions,
  express,
  cors,
  initializeApp,
  createFirebaseAppManager,
  getFirestoreInstance,
  getAuth,
  getEnvironmentVariables,
  logDebug: logDebugEffect,
  createStartupBoundary: createEffectStartupBoundary,
  createHttpBoundary: createEffectHttpBoundary,
  createInvocationBoundary: createEffectInvocationBoundary,
  initializeFirebaseApp,
  registerGetRoute,
  useMiddleware,
  logError,
  sendHttpResponse,
  sendJsonResponse,
});
export const handle = runtime.handle;
export const handleGetModerationVariant = runtime.handleGetModerationVariant;
