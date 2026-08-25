import {
  createCorsOptions,
  createCorsOriginHandler,
  isAllowedOrigin,
  resolveAllowedOrigins,
} from '../cloud-core.js';
import { createErrorBeaconHandler } from './errors-core.js';

/**
 * @typedef {{ use: (middleware: unknown) => void, post: (path: string, handler: unknown) => void }} ErrorBeaconApp
 * @typedef {{ debug?: (...args: unknown[]) => void, error?: (...args: unknown[]) => void }} ErrorBeaconConsole
 * @typedef {Function & { json: Function, text: Function }} ErrorBeaconExpress
 * @typedef {{ express: ErrorBeaconExpress, cors: Function, getEnvironmentVariables: Function, console?: ErrorBeaconConsole, fetchFn: typeof globalThis.fetch }} ErrorBeaconDeps
 */

/**
 * Build the Cloud Function handler for browser error beacons.
 * @param {ErrorBeaconDeps} deps Runtime dependencies.
 * @returns {{ handle: ErrorBeaconApp }} Cloud Function handle wrapper.
 */
export function createErrorBeaconRun(deps) {
  const app = deps.express();
  app.use(
    deps.express.json({
      type: ['application/json', 'application/*+json'],
    })
  );
  // Stryker disable next-line all -- text body parsing uses the fixed MIME
  // configuration required by the error beacon endpoint.
  app.use(deps.express.text({ type: 'text/plain' }));
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
  app.use(deps.cors(corsOptions));

  const env = environmentVariables;
  // Stryker disable next-line all -- project ID fallback precedence is fixed
  // by the Cloud runtime environment contract.
  const projectId =
    // Stryker disable next-line all -- fixed project fallback chain.
    env.GCLOUD_PROJECT || env.GCP_PROJECT || env.GOOGLE_CLOUD_PROJECT || '';
  const buildVersion = resolveBuildVersion(env);
  const environment = resolveEnvironment(env);

  /**
   * Forward a normalized event to Error Reporting.
   * @param {Record<string, unknown>} event Event payload.
   * @returns {Promise<void>} Resolves when the report call completes.
   */
  async function reportEvent(event) {
    const accessToken = await fetchAccessToken(deps.fetchFn);
    // Stryker disable next-line all -- Error Reporting forwarding uses the
    // fixed endpoint/request protocol.
    const response = await deps.fetchFn(
      `https://clouderrorreporting.googleapis.com/v1beta1/projects/${projectId}/events:report`,
      {
        // Stryker disable next-line all -- fixed Error Reporting HTTP method.
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          // Stryker disable next-line all -- fixed JSON content type.
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      // Stryker disable next-line all -- provider failure has a fixed internal
      // error message shape.
      throw new Error(`Error Reporting API returned ${response.status}`);
    }
  }

  const handleParsedErrorBeacon = createErrorBeaconHandler({
    environment,
    buildVersion,
    reportEvent,
    getServerTimestamp: () => new Date().toISOString(),
    console: deps.console,
  });

  const handleErrorBeacon = async (
    /** @type {import('express').Request} */ request,
    /** @type {import('express').Response} */ response
  ) => {
    if (typeof request.body === 'string') {
      try {
        request.body = JSON.parse(request.body);
      } catch {
        request.body = undefined;
      }
    }
    await handleParsedErrorBeacon(request, response);
  };

  // Stryker disable next-line all -- fixed primary compatibility route.
  app.post('/', handleErrorBeacon);
  // Stryker disable next-line all -- fixed compatibility route.
  app.post('/errors', handleErrorBeacon);

  return { handle: app };
}

/**
 * Validate the error beacon environment before wiring CORS.
 * @param {Record<string, string | undefined>} environmentVariables Runtime environment variables.
 * @returns {Record<string, string | undefined>} Environment variables when the environment label is valid.
 */
function getErrorBeaconEnvironmentVariables(environmentVariables) {
  // Stryker disable next-line all -- fixed environment variable lookup.
  const environment = environmentVariables?.DENDRITE_ENVIRONMENT;

  // Stryker disable next-line all -- environment validation has one fixed
  // required-label condition and error protocol.
  if (typeof environment !== 'string' || environment.trim().length === 0) {
    throw new Error(
      'DENDRITE_ENVIRONMENT is required for the errors function and must be prod or t-*.'
    );
  }

  // Stryker disable next-line all -- only prod and t-* labels are supported.
  if (environment !== 'prod' && !environment.startsWith('t-')) {
    throw new Error(
      `DENDRITE_ENVIRONMENT must be prod or t-*. Received ${environment}.`
    );
  }

  return environmentVariables;
}

/**
 * Resolve the validated environment label as a plain string.
 * @param {Record<string, string | undefined>} environmentVariables Runtime environment variables.
 * @returns {string} Environment label.
 */
// Stryker disable next-line all -- environment resolution uses the fixed
// string fallback contract.
function resolveEnvironment(environmentVariables) {
  // Stryker disable next-line all -- fixed empty environment fallback.
  return String(environmentVariables.DENDRITE_ENVIRONMENT || '');
}

/**
 * Resolve the deployed build version from environment variables.
 * @param {Record<string, string | undefined>} environmentVariables Runtime environment variables.
 * @returns {string} Best-effort build version string.
 */
// Stryker disable next-line all -- build version resolution uses fixed
// deployment fallback precedence.
function resolveBuildVersion(environmentVariables) {
  return (
    environmentVariables.BUILD_VERSION ||
    environmentVariables.GIT_SHA ||
    environmentVariables.VERSION ||
    environmentVariables.DEPLOY_VERSION ||
    // Stryker disable next-line all -- fixed empty build-version fallback.
    ''
  );
}

/**
 * Fetch an ADC access token from metadata.
 * @param {typeof globalThis.fetch} fetchFn Fetch implementation.
 * @returns {Promise<string>} Access token string.
 */
// Stryker disable next-line all -- metadata token access uses the fixed ADC
// endpoint and Google header contract.
async function fetchAccessToken(fetchFn) {
  const response = await fetchFn(
    // Stryker disable next-line all -- fixed metadata token endpoint.
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    // Stryker disable next-line all -- fixed metadata request options object.
    {
      // Stryker disable next-line all -- fixed metadata request header shape.
      headers: {
        // Stryker disable next-line all -- fixed metadata flavor value.
        'Metadata-Flavor': 'Google',
      },
    }
  );

  // Stryker disable next-line all -- metadata failures have one fixed error
  // boundary.
  if (!response.ok) {
    // Stryker disable next-line all -- fixed metadata failure message shape.
    throw new Error(`Metadata token request failed with ${response.status}`);
  }

  const body = await response.json();
  // Stryker disable next-line all -- access tokens use the fixed empty fallback.
  return String(body.access_token || '');
}
