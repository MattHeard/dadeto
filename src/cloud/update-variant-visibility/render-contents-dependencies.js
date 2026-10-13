import {
  bindEffectBoundary,
  createSaveRenderedPage,
  effectFetchFn,
  fetchFn,
} from '../render-contents/render-contents-gcf.js';
import {
  logRenderContentsError,
  sendHttpResponse,
  setHttpResponseHeader,
} from '../render-contents/response-effects.js';
import { registerRenderContentsTriggers } from '../render-contents/trigger-effect-adapters.js';

/** @param {{functions: unknown, Storage: unknown, getAuth: () => unknown, ADMIN_UID: string, crypto: unknown, getEnvironmentVariables: () => Record<string, string | undefined>}} runtime Shared Cloud Function dependencies. */
export function createUpdateVariantRenderDependencies(runtime) {
  return {
    ...runtime,
    registerRenderContentsTriggers,
    fetchFn,
    bindEffectBoundary,
    setHttpResponseHeader,
    sendHttpResponse,
    logError: logRenderContentsError,
    effectFetchFn,
    createSaveRenderedPage,
  };
}
