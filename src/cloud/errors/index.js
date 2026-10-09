import { express, cors, getEnvironmentVariables } from './errors-gcf.js';
import { createErrorBeaconRun } from '../../core/cloud/errors/run.js';
import { createEffectInvocationBoundary } from '../allow-effects.js';
import {
  registerPostRoute,
  useMiddleware,
} from './effect-adapters.js';
import { logDebug, logError } from './log-adapters.js';
import { respondEmpty, respondJson, respondText } from './response-adapters.js';

const { handle } = createErrorBeaconRun({
  express,
  cors,
  getEnvironmentVariables,
  console,
  fetchFn: (permission, ...args) => globalThis.fetch(...args),
  bindEffectBoundary: handler => createEffectInvocationBoundary(handler)(),
  effectFetchFn: (permission, ...args) => globalThis.fetch(...args),
  useMiddleware,
  registerPostRoute,
  respondJson,
  respondText,
  respondEmpty,
  logDebug,
  logError,
});

export { handle };
