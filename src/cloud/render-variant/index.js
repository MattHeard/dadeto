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
} from './render-variant-gcf.js';
import { runRenderVariant } from '../../core/cloud/render-variant/run.js';
import { createTreeVisibilityRegenerationHandles } from '../../core/cloud/tree-visibility/run.js';

const { renderVariant: handle, render } = runRenderVariant({
  initializeApp,
  createFirebaseAppManager,
  getFirestoreInstance,
  getEnvironmentVariables,
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
