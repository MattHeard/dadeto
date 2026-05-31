import { initializeApp } from 'firebase-admin/app';
import {
  functions,
  Storage,
  getAuth,
  createFirebaseAppManager,
  getFirestoreInstance,
  ADMIN_UID,
  fetchFn,
  crypto,
  getEnvironmentVariables,
} from './render-contents-gcf.js';
import { createRenderContentsEntrypoint } from '../../core/cloud/render-contents/index.js';

const entrypoint = createRenderContentsEntrypoint({
  initializeApp,
  functions,
  Storage,
  getAuth,
  createFirebaseAppManager,
  getFirestoreInstance,
  ADMIN_UID,
  fetchFn,
  crypto,
  getEnvironmentVariables,
});

export const handle = entrypoint.handle;
export const handleTrigger = entrypoint.handleTrigger;
export const render = entrypoint.render;
export const fetchTopStoryIds = entrypoint.fetchTopStoryIds;
export const fetchStoryInfo = entrypoint.fetchStoryInfo;
export const handleRenderRequest = entrypoint.handleRenderRequest;
export { buildHtml } from '../../core/cloud/render-contents/render-contents-core.js';
