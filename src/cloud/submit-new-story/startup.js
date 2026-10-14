import { initializeApp } from 'firebase-admin/app';
import { createEffectHttpBoundary, createEffectStartupBoundary } from '../allow-effects.js';
import * as cloud from './submit-new-story-gcf.js';
import { runSubmitNewStory } from '../../core/cloud/submit-new-story/run.js';
import { getAllowedOrigins } from './cors-config.js';
import {
  forwardSubmitNewStoryCorsError,
  logSubmitNewStory,
  saveSubmitNewStory,
  sendSubmitNewStoryResponse,
} from './effect-adapters.js';
import {
  bindSubmitNewStoryCorsErrorBoundary,
  ensureSubmitNewStoryFirebase,
  registerSubmitNewStoryEndpoint,
} from './startup-effect-adapter.js';

/** @param {import('../../types/allow-effects').AllowEffects} allowEffects Startup capability. */
export function createSubmitNewStoryStartup(allowEffects) {
  const { ensureFirebaseApp } = cloud.createFirebaseAppManager(initializeApp);
  ensureSubmitNewStoryFirebase(allowEffects, ensureFirebaseApp);
  const environment = cloud.getEnvironmentVariables();
  const db = cloud.getFirestoreInstance({ environment, ensureAppFn: () => {} });
  return runSubmitNewStory(allowEffects, {
    ...cloud,
    db,
    auth: cloud.getAuth(),
    getEnvironmentVariables: () => environment,
    getAllowedOrigins,
    saveSubmission: saveSubmitNewStory,
    sendResponse: sendSubmitNewStoryResponse,
    logInfo: (permission, ...values) => logSubmitNewStory(permission, console.info, ...values),
    logError: (permission, ...values) => logSubmitNewStory(permission, console.error, ...values),
    forwardCorsError: forwardSubmitNewStoryCorsError,
    bindCorsErrorBoundary: bindSubmitNewStoryCorsErrorBoundary,
    createEndpoint: registerSubmitNewStoryEndpoint,
  }, createEffectHttpBoundary);
}

export const handle = createEffectStartupBoundary(createSubmitNewStoryStartup).submitNewStory;
