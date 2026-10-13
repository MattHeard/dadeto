import {
  functions,
  FieldValue,
  Storage,
  ensureFirebaseApp,
  getFirestoreInstance,
  fetchFn,
  crypto,
  getEnvironmentVariables,
  bindEffectBoundary,
  effectFetchFn,
} from './render-variant-gcf.js';
import {
  saveStorageFile,
  setFirestoreDocument,
  updateFirestoreDocument,
} from './effect-adapters.js';
import { createRenderVariantStartup } from './startup-effect-adapter.js';
import { logRenderVariantError } from './logging-effect-adapter.js';
import { sendTreeVisibilityResponse } from './tree-visibility-effect-adapters.js';

const { renderVariant: handle, render, regenerationHandles } =
  createRenderVariantStartup({
    ensureFirebaseApp,
    getFirestoreInstance,
    getEnvironmentVariables,
    bindEffectBoundary,
    updateFirestoreDocument,
    setFirestoreDocument,
    saveStorageFile,
    effectFetchFn,
    logError: logRenderVariantError,
    sendTreeVisibilityResponse,
    functions,
    FieldValue,
    Storage,
    fetchFn,
    crypto,
  });

export { handle, render };

export const regenerateTreeWeights = regenerationHandles.scheduled;
export const regenerateTreeWeightsHttp = regenerationHandles.http;
