import { randomUUID } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import {
  functions,
  FieldValue,
  getFirestoreInstance,
  createFirebaseAppManager,
} from './process-new-story-gcf.js';
import {
  createEffectInvocationBoundary,
  createEffectStartupBoundary,
} from '../allow-effects.js';
import { createSubmissionBatch } from '../process-new-page/effect-adapters.js';
import { initializeFirebaseApp as initializeFirebaseAppEffect } from './startup-effect-adapter.js';
import { createProcessNewStoryHandle } from '../../core/cloud/process-new-story/process-new-story-core.js';

const db = createEffectStartupBoundary(allowEffects => {
  const manager = createFirebaseAppManager(() =>
    initializeFirebaseAppEffect(allowEffects, initializeApp)
  );
  manager.ensureFirebaseApp();
  return getFirestoreInstance({ ensureAppFn: () => {} });
});

const handle = createProcessNewStoryHandle({
  functions,
  getFirestoreInstance: () => db,
  fieldValue: FieldValue,
  randomUUID,
  random: Math.random,
  createBatch: createSubmissionBatch,
  bindEffectInvocationBoundary: createEffectInvocationBoundary,
});

export { handle };
