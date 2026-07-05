import { express, cors, getEnvironmentVariables } from './errors-gcf.js';
import { createErrorBeaconRun } from '../../core/cloud/errors/run.js';

const { handle } = createErrorBeaconRun({
  express,
  cors,
  getEnvironmentVariables,
  console,
  fetchFn: (...args) => globalThis.fetch(...args),
});

export { handle };
