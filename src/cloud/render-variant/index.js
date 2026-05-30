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
