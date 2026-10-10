import { initializeApp } from 'firebase-admin/app';
import {
  functions,
  FieldValue,
  Storage,
  createFirebaseAppManager,
  getFirestoreInstance,
  fetchFn,
  crypto,
  getEnvironmentVariables,
  bindEffectBoundary,
  effectFetchFn,
} from './render-variant-gcf.js';
import { runRenderVariant } from '../../core/cloud/render-variant/run.js';
import { createTreeVisibilityRegenerationHandles } from '../../core/cloud/tree-visibility/run.js';
import { updateVariantDocument } from './effect-adapters.js';

const { renderVariant: handle, render } = runRenderVariant({
  initializeApp,
  createFirebaseAppManager,
  getFirestoreInstance,
  getEnvironmentVariables,
  bindEffectBoundary,
  updateVariantDocument,
  effectFetchFn,
  functions,
  FieldValue,
  Storage,
  fetchFn,
  crypto,
});

export { handle, render };

const regenerationHandles = createTreeVisibilityRegenerationHandles({
  functions,
  getFirestoreInstance,
  render,
});

export const regenerateTreeWeights = regenerationHandles.scheduled;
export const regenerateTreeWeightsHttp = regenerationHandles.http;
