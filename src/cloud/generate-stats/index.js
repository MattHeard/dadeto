import {
  Storage,
  cors,
  express,
  functions,
  getAuth,
  getFirestore,
  getEnvironmentVariables,
  initializeApp,
  OAuth2Client,
  fetchFn,
  crypto,
} from './generate-stats-gcf.js';
import { createGenerateStatsHandle } from '../../core/cloud/generate-stats/run.js';
import { createSchedulerRequestVerifier } from '../../core/cloud/generate-stats/scheduler-auth.js';

const environment = getEnvironmentVariables();
const oidcClient = new OAuth2Client();
const verifySchedulerRequest = createSchedulerRequestVerifier({
  verifyIdToken: (token, audience) =>
    oidcClient.verifyIdToken({ idToken: token, audience }),
  audience: environment.GENERATE_STATS_SCHEDULER_AUDIENCE,
  serviceAccountEmail: environment.GENERATE_STATS_SCHEDULER_EMAIL,
});

const handle = createGenerateStatsHandle({
  Storage,
  cors,
  express,
  functions,
  getAuth,
  getFirestore,
  getEnvironmentVariables: () => environment,
  initializeApp,
  verifySchedulerRequest,
  fetchFn,
  crypto,
});

export { handle };
