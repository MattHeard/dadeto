import {
  Storage,
  cors,
  express,
  functions,
  getAuth,
  getFirestore,
  getEnvironmentVariables,
  initializeApp,
  fetchFn,
  crypto,
} from './generate-stats-gcf.js';
import { createGenerateStatsHandle } from '../../core/cloud/generate-stats/run.js';

const handle = createGenerateStatsHandle({
  Storage,
  cors,
  express,
  functions,
  getAuth,
  getFirestore,
  getEnvironmentVariables,
  initializeApp,
  fetchFn,
  crypto,
});

export { handle };
