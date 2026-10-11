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
  createEffectStartupBoundary,
  logDebugEffect,
} from '../allow-effects.js';

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
  logDebug: logDebugEffect,
  ADMIN_UID,
});

export { handle, handleRequest };
export {
  findVariantRef,
  markVariantDirtyImpl,
} from './mark-variant-dirty-core.js';
