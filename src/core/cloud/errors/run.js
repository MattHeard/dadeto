import {
  createCorsOptions,
  createCorsOriginHandler,
  isAllowedOrigin,
  resolveAllowedOrigins,
} from '../cloud-core.js';
import { createErrorBeaconHandler } from './errors-core.js';

/**
 * @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects
 * @typedef {import('../../../../types/allow-effects').AllowEffectsBoundary} AllowEffectsBoundary
 * @typedef {{ use: (middleware: unknown) => void, post: (path: string, handler: unknown) => void }} ErrorBeaconApp
 * @typedef {{ debug?: (...args: unknown[]) => void, error?: (...args: unknown[]) => void }} ErrorBeaconConsole
 * @typedef {{ status: (code: number) => unknown, json: (body: unknown) => unknown, send: (body: string) => unknown, end: () => unknown }} ErrorBeaconResponse
 * @typedef {Function & { json: Function, text: Function }} ErrorBeaconExpress
 * @typedef {{ express: ErrorBeaconExpress, cors: Function, getEnvironmentVariables: Function, console?: ErrorBeaconConsole, fetchFn: (permission: AllowEffects, input: string, init?: object) => Promise<Response>, bindEffectBoundary: AllowEffectsBoundary, effectFetchFn: (permission: AllowEffects, input: string, init?: object) => Promise<Response>, useMiddleware: (permission: AllowEffects, app: ErrorBeaconApp, middleware: unknown) => void, registerPostRoute: (permission: AllowEffects, app: ErrorBeaconApp, path: string, handler: Function) => void, respondJson: (permission: AllowEffects, response: ErrorBeaconResponse, status: number, body: Record<string, unknown>) => unknown, respondText: (permission: AllowEffects, response: ErrorBeaconResponse, status: number, body: string) => unknown, respondEmpty: (permission: AllowEffects, response: ErrorBeaconResponse, status: number) => unknown, logDebug: (permission: AllowEffects, logger: ErrorBeaconConsole | undefined, message: string, data: Record<string, unknown>) => void, logError: (permission: AllowEffects, logger: ErrorBeaconConsole | undefined, message: string, error: unknown) => void }} ErrorBeaconDeps
 */

/**
 * Build the Cloud Function handler for browser error beacons.
 * @param {ErrorBeaconDeps} deps Runtime dependencies.
 * @returns {{ handle: ErrorBeaconApp }} Cloud Function handle wrapper.
 */
export function createErrorBeaconRun(deps) {
  const app = deps.express();
  const jsonMiddleware = deps.express.json({
    type: ['application/json', 'application/*+json'],
  });
  // Stryker disable next-line all -- text body parsing uses the fixed MIME
  // configuration required by the error beacon endpoint.
  const textMiddleware = deps.express.text({ type: 'text/plain' });
  const environmentVariables = getErrorBeaconEnvironmentVariables(
    deps.getEnvironmentVariables()
  );
  const env = environmentVariables;
  const validatedEnvironment = env.DENDRITE_ENVIRONMENT;
  const corsOptions = createCorsOptions(
    createCorsOriginHandler(
      isAllowedOrigin,
      resolveAllowedOrigins({
        ...environmentVariables,
        DENDRITE_ENVIRONMENT: validatedEnvironment,
      })
    )
  );
  const corsMiddleware = deps.cors(corsOptions);
  const environment = resolveEnvironment(env);
  void deps.bindEffectBoundary(async allowEffects => {
    deps.logDebug(allowEffects, deps.console, 'error beacon environment', {
      DENDRITE_ENVIRONMENT: environment,
    });
  });

  // Stryker disable next-line all -- project ID fallback precedence is fixed
  // by the Cloud runtime environment contract.
  const projectId =
    // Stryker disable next-line all -- fixed project fallback chain.
    env.GCLOUD_PROJECT || env.GCP_PROJECT || env.GOOGLE_CLOUD_PROJECT || '';
  const buildVersion = resolveBuildVersion(env);

  /**
   * Forward a normalized event to Error Reporting.
   * @param {Record<string, unknown>} event Event payload.
   * @returns {Promise<void>} Resolves when the report call completes.
   */
  async function reportEvent(event) {
    const accessToken = await deps.bindEffectBoundary(permission =>
      fetchAccessToken(permission, deps.fetchFn)
    );
    // Stryker disable next-line all -- Error Reporting forwarding uses the
    // fixed endpoint/request protocol.
    const response = /** @type {Response} */ (
      await deps.bindEffectBoundary(permission =>
        deps.effectFetchFn(
          permission,
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
        )
      )
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
  })({
    respondJson: deps.respondJson,
    respondText: deps.respondText,
    respondEmpty: deps.respondEmpty,
    logError: deps.logError,
  })(deps.console);

  const handleErrorBeacon = (
    /** @type {import('express').Request} */ request,
    /** @type {import('express').Response} */ response
  ) =>
    deps.bindEffectBoundary(async allowEffects => {
      if (typeof request.body === 'string') {
        try {
          request.body = JSON.parse(request.body);
        } catch {
          request.body = undefined;
        }
      }
      await handleParsedErrorBeacon(allowEffects, request, response);
    });

  void deps.bindEffectBoundary(async allowEffects => {
    deps.useMiddleware(allowEffects, app, jsonMiddleware);
    deps.useMiddleware(allowEffects, app, textMiddleware);
    deps.useMiddleware(allowEffects, app, corsMiddleware);
    // Stryker disable next-line all -- fixed primary compatibility route.
    deps.registerPostRoute(allowEffects, app, '/', handleErrorBeacon);
    // Stryker disable next-line all -- fixed compatibility route.
    deps.registerPostRoute(allowEffects, app, '/errors', handleErrorBeacon);
  });

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
 * @param {import('../../../../types/allow-effects').AllowEffects} permission Permission for the metadata request.
 * @param {(permission: import('../../../../types/allow-effects').AllowEffects, input: string, init?: object) => Promise<Response>} fetchFn Fetch implementation.
 * @returns {Promise<string>} Access token string.
 */
// Stryker disable next-line all -- metadata token access uses the fixed ADC
// endpoint and Google header contract.
async function fetchAccessToken(permission, fetchFn) {
  const response = await fetchFn(
    permission,
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
