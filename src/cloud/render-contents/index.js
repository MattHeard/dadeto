import {functions, Storage, getAuth, ensureFirebaseApp, getFirestoreInstance, ADMIN_UID, fetchFn, bindEffectBoundary, effectFetchFn, createSaveRenderedPage, crypto, getEnvironmentVariables} from './render-contents-gcf.js';
import {setHttpResponseHeader, sendHttpResponse, logRenderContentsError} from './response-effects.js';
import { createRenderContentsEntrypoint } from '../../core/cloud/render-contents/index.js';
import { createRenderContentsStartup } from './startup-effect-adapter.js';
import { registerRenderContentsTriggers } from './trigger-effect-adapters.js';

const entrypoint = createRenderContentsStartup({
  ensureFirebaseApp,
  getFirestoreInstance,
  createEntrypoint: createRenderContentsEntrypoint,
  registerTriggers: registerRenderContentsTriggers,
  functions,
  Storage,
  getAuth,
  ADMIN_UID,
  fetchFn,
  bindEffectBoundary,
  setHttpResponseHeader,
  sendHttpResponse,
  logError: logRenderContentsError,
  effectFetchFn,
  createSaveRenderedPage,
  crypto,
  getEnvironmentVariables,
});

export const {
  handle,
  handleTrigger,
  render,
  fetchTopStoryIds,
  fetchStoryInfo,
  handleRenderRequest,
} = entrypoint;
export { buildHtml } from '../../core/cloud/render-contents/render-contents-core.js';
