import { express, cors, getEnvironmentVariables } from './errors-gcf.js';
import { createErrorBeaconRun } from '../../core/cloud/errors/run.js';
import { createEffectInvocationBoundary } from '../allow-effects.js';

const { handle } = createErrorBeaconRun({
  express,
  cors,
  getEnvironmentVariables,
  console,
  fetchFn: (permission, ...args) => globalThis.fetch(...args),
  bindEffectBoundary: handler => createEffectInvocationBoundary(handler)(),
  effectFetchFn: (permission, ...args) => globalThis.fetch(...args),
});

export { handle };
