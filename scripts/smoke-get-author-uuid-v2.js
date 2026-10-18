import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { productionOrigins } from '../src/core/cloud/cors-config.js';

const REQUEST_TIMEOUT_MS = 15_000;
const VALID_FUNCTION_HOST_SUFFIXES = ['.run.app', '.cloudfunctions.net'];

/**
 * Validate and run the configured-origin production smoke sequence.
 * The authenticated GET may create the author UUID document when it is absent.
 * @param {{ endpointUrl: string, origin: string, token: string, fetchFn?: typeof fetch, timeoutSignal?: (milliseconds: number) => AbortSignal }} options Smoke-check options.
 * @returns {Promise<{ endpointHost: string, origin: string, preflightStatus: number, authenticatedGetStatus: number, repeatGetStatus: number, missingTokenStatus: number, invalidTokenStatus: number, uuidStable: true }>} Non-secret evidence.
 */
export async function runGetAuthorUuidV2Smoke({
  endpointUrl,
  origin,
  token,
  fetchFn = globalThis.fetch,
  timeoutSignal = AbortSignal.timeout,
}) {
  const endpoint = parseEndpoint(endpointUrl);
  assertProductionOrigin(origin);
  if (typeof token !== 'string' || token.trim() === '') {
    throw new Error('GET_AUTHOR_UUID_SMOKE_TOKEN must be a non-empty Firebase ID token.');
  }
  if (typeof fetchFn !== 'function') {
    throw new Error('This Node.js version does not provide fetch.');
  }

  const preflightResponse = await fetchWithoutLeakingRequestData(
    fetchFn,
    endpoint.href,
    {
      method: 'OPTIONS',
      redirect: 'error',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization',
      },
      signal: timeoutSignal(REQUEST_TIMEOUT_MS),
    },
    'OPTIONS preflight'
  );
  if (preflightResponse.status !== 204) {
    throw new Error(
      `OPTIONS preflight returned ${preflightResponse.status}; expected 204.`
    );
  }
  assertHeaderEquals(preflightResponse, 'access-control-allow-origin', origin);
  assertHeaderContains(preflightResponse, 'access-control-allow-methods', 'GET');
  assertHeaderContains(preflightResponse, 'access-control-allow-methods', 'OPTIONS');
  assertHeaderContains(preflightResponse, 'access-control-allow-headers', 'authorization');

  const authenticatedHeaders = {
    Origin: origin,
    Authorization: `Bearer ${token}`,
  };
  const firstResponse = await fetchWithoutLeakingRequestData(
    fetchFn,
    endpoint.href,
    {
      method: 'GET',
      redirect: 'error',
      headers: authenticatedHeaders,
      signal: timeoutSignal(REQUEST_TIMEOUT_MS),
    },
    'Authenticated GET'
  );
  const firstUuid = await readSuccessfulUuid(firstResponse, 'Authenticated GET');

  const repeatedResponse = await fetchWithoutLeakingRequestData(
    fetchFn,
    endpoint.href,
    {
      method: 'GET',
      redirect: 'error',
      headers: authenticatedHeaders,
      signal: timeoutSignal(REQUEST_TIMEOUT_MS),
    },
    'Repeated authenticated GET'
  );
  const repeatedUuid = await readSuccessfulUuid(
    repeatedResponse,
    'Repeated authenticated GET'
  );
  if (firstUuid !== repeatedUuid) {
    throw new Error('Repeated authenticated GET returned a different UUID.');
  }

  const missingTokenResponse = await fetchWithoutLeakingRequestData(
    fetchFn,
    endpoint.href,
    {
      method: 'GET',
      redirect: 'error',
      headers: { Origin: origin },
      signal: timeoutSignal(REQUEST_TIMEOUT_MS),
    },
    'GET without an Authorization header'
  );
  assertUnauthorized(missingTokenResponse, 'GET without an Authorization header');

  const invalidTokenResponse = await fetchWithoutLeakingRequestData(
    fetchFn,
    endpoint.href,
    {
      method: 'GET',
      redirect: 'error',
      headers: {
        Origin: origin,
        Authorization: 'Bearer invalid-smoke-token',
      },
      signal: timeoutSignal(REQUEST_TIMEOUT_MS),
    },
    'GET with an invalid Authorization token'
  );
  assertUnauthorized(invalidTokenResponse, 'GET with an invalid Authorization token');

  return {
    endpointHost: endpoint.host,
    origin,
    preflightStatus: preflightResponse.status,
    authenticatedGetStatus: firstResponse.status,
    repeatGetStatus: repeatedResponse.status,
    missingTokenStatus: missingTokenResponse.status,
    invalidTokenStatus: invalidTokenResponse.status,
    uuidStable: true,
  };
}

/**
 * Require an explicit invocation flag before any production request is sent.
 * @param {{ argv?: string[], environment?: Record<string, string | undefined>, fetchFn?: typeof fetch, writeLine?: (message: string) => void, timeoutSignal?: (milliseconds: number) => AbortSignal }} options CLI dependencies.
 * @returns {Promise<number>} Process exit code.
 */
export async function main({
  argv = process.argv.slice(2),
  environment = process.env,
  fetchFn = globalThis.fetch,
  writeLine = console.log,
  timeoutSignal = AbortSignal.timeout,
} = {}) {
  if (argv.includes('--help')) {
    writeLine(
      'After production-apply approval, set GET_AUTHOR_UUID_SMOKE_URL, GET_AUTHOR_UUID_SMOKE_ORIGIN, and GET_AUTHOR_UUID_SMOKE_TOKEN, then run this file with --execute.'
    );
    writeLine(
      'The authenticated GET may create an author UUID document. The script never prints the token or UUID.'
    );
    return 0;
  }
  if (!argv.includes('--execute')) {
    writeLine('No requests sent. Pass --execute only after the production apply is authorized.');
    return 0;
  }

  const result = await runGetAuthorUuidV2Smoke({
    endpointUrl: environment.GET_AUTHOR_UUID_SMOKE_URL,
    origin: environment.GET_AUTHOR_UUID_SMOKE_ORIGIN,
    token: environment.GET_AUTHOR_UUID_SMOKE_TOKEN,
    fetchFn,
    timeoutSignal,
  });
  writeLine(`get-author-uuid-v2 smoke passed: ${JSON.stringify(result)}`);
  return 0;
}

async function fetchWithoutLeakingRequestData(fetchFn, url, options, phase) {
  try {
    return await fetchFn(url, options);
  } catch {
    throw new Error(`${phase} failed before a response was received.`);
  }
}

function parseEndpoint(endpointUrl) {
  let endpoint;
  try {
    endpoint = new URL(endpointUrl);
  } catch {
    throw new Error('GET_AUTHOR_UUID_SMOKE_URL must be a valid HTTPS function URL.');
  }
  if (
    endpoint.protocol !== 'https:' ||
    endpoint.username !== '' ||
    endpoint.password !== '' ||
    !VALID_FUNCTION_HOST_SUFFIXES.some(suffix => endpoint.hostname.endsWith(suffix))
  ) {
    throw new Error(
      'GET_AUTHOR_UUID_SMOKE_URL must be an HTTPS Cloud Functions or Cloud Run URL.'
    );
  }
  return endpoint;
}

function assertProductionOrigin(origin) {
  if (!productionOrigins.includes(origin)) {
    throw new Error(
      'GET_AUTHOR_UUID_SMOKE_ORIGIN must exactly match a configured production origin.'
    );
  }
}

function assertHeaderEquals(response, name, expected) {
  if (response.headers?.get(name) !== expected) {
    throw new Error(`OPTIONS preflight returned an unexpected ${name} header.`);
  }
}

function assertHeaderContains(response, name, expected) {
  const values = response.headers?.get(name) ?? '';
  const containsExpected = values
    .split(',')
    .some(value => value.trim().toLowerCase() === expected.toLowerCase());
  if (!containsExpected) {
    throw new Error(`OPTIONS preflight omitted ${expected} from ${name}.`);
  }
}

async function readSuccessfulUuid(response, phase) {
  if (response.status !== 200) {
    throw new Error(`${phase} returned ${response.status}; expected 200.`);
  }
  if (!(response.headers?.get('content-type') ?? '').includes('application/json')) {
    throw new Error(`${phase} did not return JSON.`);
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(`${phase} returned invalid JSON.`);
  }
  if (typeof body?.uuid !== 'string' || body.uuid.trim() === '') {
    throw new Error(`${phase} returned no UUID.`);
  }
  return body.uuid;
}

function assertUnauthorized(response, phase) {
  if (response.status !== 401) {
    throw new Error(`${phase} returned ${response.status}; expected 401.`);
  }
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  main()
    .then(exitCode => {
      process.exitCode = exitCode;
    })
    .catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
