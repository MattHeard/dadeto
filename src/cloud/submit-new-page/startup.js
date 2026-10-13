import { initializeApp } from 'firebase-admin/app';
import { createEffectHttpBoundary } from '../allow-effects.js';
import { getAllowedOrigins } from './cors-config.js';
import { createSubmitNewPageRuntime } from './runtime.js';
import * as cloud from './submit-new-page-gcf.js';
import * as core from './submit-new-page-core.js';
import * as helpers from './helpers.js';
import {
  ensureSubmitNewPageFirebase,
  registerSubmitNewPageEndpoint,
  registerSubmitNewPagePost,
  useSubmitNewPageMiddleware,
} from './effect-adapters.js';
import { sendSubmitNewPageResponse } from './request-effect-adapter.js';

/** @param {import('../../types/allow-effects').AllowEffects} allowEffects Startup capability. */
export function createSubmitNewPageStartup(allowEffects) {
  const handleSubmitCore = createSubmitNewPageRuntime(allowEffects, {
    ...cloud,
    ...helpers,
    createHandleSubmit: core.createHandleSubmit,
    initializeApp,
    ensureFirebaseInitialized: ensureSubmitNewPageFirebase,
  });
  const app = core.createSubmitNewPageApp(allowEffects, {
    express: cloud.express,
    cors: cloud.cors,
    allowedOrigins: getAllowedOrigins(cloud.getEnvironmentVariables()),
    handleSubmit: core.createSubmitNewPageRequestHandler(
      handleSubmitCore,
      createEffectHttpBoundary,
      sendSubmitNewPageResponse
    ),
    useMiddleware: useSubmitNewPageMiddleware,
    registerPost: registerSubmitNewPagePost,
  });
  return registerSubmitNewPageEndpoint(allowEffects, cloud.functions, app);
}
