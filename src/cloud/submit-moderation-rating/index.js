import {
  functions,
  express,
  cors,
  getAuth,
  FieldValue,
  ensureFirebaseApp,
  getFirestoreInstance,
  crypto,
  getEnvironmentVariables,
} from './submit-moderation-rating-gcf.js';
import { runSubmitModerationRating } from '../../core/cloud/submit-moderation-rating/run.js';
import { createEffectHttpBoundary } from '../allow-effects.js';
import { createSubmitModerationRatingStartup } from './startup-effect-adapter.js';
import { registerHttpEndpoint } from '../http-endpoint-effect-adapter.js';
import {
  updateModeratorAssignment,
  recordRating,
} from './firestore-effect-adapters.js';
import {
  sendModerationRatingResponse,
} from './effect-adapters.js';

const { submitModerationRating, handleSubmitModerationRating } =
  createSubmitModerationRatingStartup({
    ensureFirebaseApp,
    createEntrypoint: runSubmitModerationRating,
    bindHttpBoundary: createEffectHttpBoundary,
    updateModeratorAssignment,
    recordRating,
    registerHttpEndpoint,
    sendResponse: sendModerationRatingResponse,
    functions,
    express,
    cors,
    getAuth,
    FieldValue,
    getFirestoreInstance,
    crypto,
    getEnvironmentVariables,
  });

export { submitModerationRating as handle, handleSubmitModerationRating };
