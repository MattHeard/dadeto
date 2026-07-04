import {
  createCorsOptions,
  createCorsOriginHandler,
  resolveAllowedOrigins,
} from '../cloud-core.js';
import { createErrorBeaconHandler } from './errors-core.js';

/**
 * Build the Cloud Function handler for browser error beacons.
 * @param {{
 *   express: any,
 *   cors: any,
 *   getEnvironmentVariables: () => Record<string, string | undefined>,
 *   fetchFn: typeof fetch,
 * }} deps Runtime dependencies.
 * @returns {{ handle: import('express').Express }} Cloud Function handle wrapper.
 */
export function createErrorBeaconRun(deps) {
  const app = deps.express();
  /** @type {any} */ (app).use(
    deps.express.json({ type: ['application/json', 'application/*+json'] })
  );
  const corsOptions = createCorsOptions(
    createCorsOriginHandler(
      resolveAllowedOrigins,
      resolveAllowedOrigins(deps.getEnvironmentVariables())
    )
  );
  /** @type {any} */ (app).use(deps.cors(corsOptions));

  const env = deps.getEnvironmentVariables();
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
  });

  /** @type {any} */ (app).post('/', handleErrorBeacon);
  /** @type {any} */ (app).post('/errors', handleErrorBeacon);

  return { handle: app };
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
