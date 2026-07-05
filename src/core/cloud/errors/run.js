import {
  createCorsOptions,
  createCorsOriginHandler,
  isAllowedOrigin,
  resolveAllowedOrigins,
} from '../cloud-core.js';
import { createErrorBeaconHandler } from './errors-core.js';

/**
 * Build the Cloud Function handler for browser error beacons.
 * @param {{
 *   express: any,
 *   cors: any,
 *   getEnvironmentVariables: () => Record<string, string | undefined>,
 *   console?: Pick<Console, 'debug'>,
 *   fetchFn: typeof fetch,
 * }} deps Runtime dependencies.
 * @returns {{ handle: import('express').Express }} Cloud Function handle wrapper.
 */
export function createErrorBeaconRun(deps) {
  const app = deps.express();
  /** @type {any} */ (app).use(
    deps.express.json({ type: ['application/json', 'application/*+json'] })
  );
  const environmentVariables = getErrorBeaconEnvironmentVariables(
    deps.getEnvironmentVariables()
  );
  deps.console?.debug?.('error beacon environment', {
    DENDRITE_ENVIRONMENT: environmentVariables.DENDRITE_ENVIRONMENT,
  });
  const corsOptions = createCorsOptions(
    createCorsOriginHandler(
      isAllowedOrigin,
      resolveAllowedOrigins(environmentVariables)
    )
  );
  /** @type {any} */ (app).use(deps.cors(corsOptions));

  const env = environmentVariables;
  const projectId =
    env.GCLOUD_PROJECT || env.GCP_PROJECT || env.GOOGLE_CLOUD_PROJECT || '';

  /**
   * Forward a normalized event to Error Reporting.
   * @param {Record<string, unknown>} event Event payload.
   * @returns {Promise<void>} Resolves when the report call completes.
   */
  async function reportEvent(event) {
    const accessToken = await fetchAccessToken(deps.fetchFn);
    const response = await deps.fetchFn(
      `https://clouderrorreporting.googleapis.com/v1beta1/projects/${projectId}/events:report`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event }),
      }
    );

    if (!response.ok) {
      throw new Error(`Error Reporting API returned ${response.status}`);
    }
  }

  const handleErrorBeacon = createErrorBeaconHandler({
    projectId,
    reportEvent,
    getServerTimestamp: () => new Date().toISOString(),
    console: deps.console,
  });

  /** @type {any} */ (app).post('/', handleErrorBeacon);
  /** @type {any} */ (app).post('/errors', handleErrorBeacon);

  return { handle: app };
}

/**
 * Validate the error beacon environment before wiring CORS.
 * @param {Record<string, string | undefined>} environmentVariables Runtime environment variables.
 * @returns {Record<string, string | undefined>} Environment variables when the environment label is valid.
 */
function getErrorBeaconEnvironmentVariables(environmentVariables) {
  const environment = environmentVariables?.DENDRITE_ENVIRONMENT;

  if (typeof environment !== 'string' || environment.trim().length === 0) {
    throw new Error(
      'DENDRITE_ENVIRONMENT is required for the errors function and must be prod or t-*.'
    );
  }

  if (environment !== 'prod' && !environment.startsWith('t-')) {
    throw new Error(
      `DENDRITE_ENVIRONMENT must be prod or t-*. Received ${environment}.`
    );
  }

  return environmentVariables;
}

/**
 * Fetch an ADC access token from metadata.
 * @param {typeof fetch} fetchFn Fetch implementation.
 * @returns {Promise<string>} Access token string.
 */
async function fetchAccessToken(fetchFn) {
  const response = await fetchFn(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    {
      headers: {
        'Metadata-Flavor': 'Google',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Metadata token request failed with ${response.status}`);
  }

  const body = await response.json();
  return String(body.access_token || '');
}
