import {
  functions,
  express,
  cors,
  FieldValue,
  ensureFirebaseApp,
  getFirestoreInstance,
  getEnvironmentVariables,
} from './report-for-moderation-gcf.js';
import { runReportForModeration } from '../../core/cloud/report-for-moderation/run.js';
import { createEffectHttpBoundary } from '../allow-effects.js';
import { createReportModerationStartup } from './startup-effect-adapter.js';
import {
  addModerationReport,
  registerReportFunction,
  registerReportRoute,
  sendReportResponse,
  useReportMiddleware,
} from './effect-adapters.js';

const { handle, handleReportForModeration } = createReportModerationStartup({
  ensureFirebaseApp,
  createEntrypoint: runReportForModeration,
  createHttpBoundary: createEffectHttpBoundary,
  addModerationReport,
  useMiddleware: useReportMiddleware,
  registerRoute: registerReportRoute,
  registerFunction: registerReportFunction,
  sendResponse: sendReportResponse,
  functions,
  express,
  cors,
  FieldValue,
  getFirestoreInstance,
  getEnvironmentVariables,
});

export { handle, handleReportForModeration };
