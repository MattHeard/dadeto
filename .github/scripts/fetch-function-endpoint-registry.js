import { createHash } from 'node:crypto';
import { appendFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { parseFunctionEndpointRegistry } from '../../src/core/build/function-endpoint-registry.js';
import { parseFunctionEndpointRegistryUrl } from '../../scripts/parse-function-endpoint-registry-url.js';

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Fetch and validate the public production function registry.
 * @param {{ registryUrl: string, fetchFn?: typeof fetch, timeoutSignal?: (milliseconds: number) => AbortSignal }} options Registry fetch dependencies.
 * @returns {Promise<{ registryUrl: string, registryHost: string, registryBody: string, registrySha256: string, registryGeneration: string | undefined, registryEtag: string | undefined, schemaVersion: number, environment: string, functions: Record<string, string>, endpointUrl: string, functionKeys: string[] }>} Validated endpoint and registry observation.
 */
export async function fetchFunctionEndpointRegistry({
  registryUrl,
  fetchFn = globalThis.fetch,
  timeoutSignal = AbortSignal.timeout,
}) {
  const endpoint = parseFunctionEndpointRegistryUrl(registryUrl);
  if (typeof fetchFn !== 'function') {
    throw new Error('This Node.js version does not provide fetch.');
  }

  let response;
  try {
    response = await fetchFn(endpoint.href, {
      method: 'GET',
      redirect: 'error',
      headers: { Accept: 'application/json' },
      signal: timeoutSignal(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new Error(
      'Registry GET failed before a response was received; check public GCS access and network connectivity.'
    );
  }

  if (response.status !== 200) {
    throw new Error(registryStatusError(response.status));
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    throw new Error('Registry GET did not return application/json.');
  }

  const cacheControl = response.headers.get('cache-control') ?? '';
  if (!/(?:^|,)\s*no-store\s*(?:,|$)/i.test(cacheControl)) {
    throw new Error('Registry response is missing Cache-Control: no-store.');
  }

  let registryJson;
  try {
    registryJson = await response.text();
  } catch {
    throw new Error('Registry GET returned invalid JSON.');
  }

  const registry = parseFunctionEndpointRegistry(registryJson);
  const registrySha256 = createHash('sha256')
    .update(registryJson, 'utf8')
    .digest('hex');
  return {
    registryUrl: endpoint.href,
    registryHost: endpoint.host,
    registryBody: registryJson,
    registrySha256,
    registryGeneration: response.headers.get('x-goog-generation') ?? undefined,
    registryEtag: response.headers.get('etag') ?? undefined,
    schemaVersion: registry.schemaVersion,
    environment: registry.environment,
    functions: registry.functions,
    endpointUrl: registry.functions.objectMinuteRentalSearch,
    functionKeys: Object.keys(registry.functions).sort(),
  };
}

/**
 * Resolve the production search endpoint before the static browser build.
 * @param {{ argv?: string[], environment?: Record<string, string | undefined>, fetchFn?: typeof fetch, appendFileFn?: typeof appendFile, writeFileFn?: typeof writeFile, writeLine?: (message: string) => void, timeoutSignal?: (milliseconds: number) => AbortSignal, now?: () => string }} options Runner dependencies.
 * @returns {Promise<number>} Process exit code.
 */
export async function main({
  argv = process.argv.slice(2),
  environment = process.env,
  fetchFn = globalThis.fetch,
  appendFileFn = appendFile,
  writeFileFn = writeFile,
  writeLine = console.log,
  timeoutSignal = AbortSignal.timeout,
  now = () => new Date().toISOString(),
} = {}) {
  if (argv.includes('--help')) {
    writeLine(
      'Set FUNCTION_ENDPOINT_REGISTRY_URL and run this file before the production browser build.'
    );
    writeLine(
      'The command performs one anonymous GET and writes the validated search URL to GITHUB_ENV.'
    );
    return 0;
  }

  if (!environment.GITHUB_ENV) {
    throw new Error('Missing required workflow environment value: GITHUB_ENV.');
  }
  const evidencePath = requireEnvironmentValue(
    environment.FUNCTION_ENDPOINT_REGISTRY_EVIDENCE_PATH,
    'FUNCTION_ENDPOINT_REGISTRY_EVIDENCE_PATH'
  );
  const runId = requireDigits(environment.GITHUB_RUN_ID, 'GITHUB_RUN_ID');
  const sourceCommitSha = requireCommitSha(environment.GITHUB_SHA);

  const result = await fetchFunctionEndpointRegistry({
    registryUrl: environment.FUNCTION_ENDPOINT_REGISTRY_URL,
    fetchFn,
    timeoutSignal,
  });
  const observation = {
    schemaVersion: 1,
    build: {
      runId,
      sourceCommitSha,
      observedAt: now(),
    },
    registryObject: {
      url: result.registryUrl,
      body: result.registryBody,
      sha256: result.registrySha256,
      generation: result.registryGeneration,
      etag: result.registryEtag,
      schemaVersion: result.schemaVersion,
      environment: result.environment,
      functions: result.functions,
    },
  };
  await writeFileFn(
    evidencePath,
    `${JSON.stringify(observation, null, 2)}\n`,
    'utf8'
  );
  await appendFileFn(
    environment.GITHUB_ENV,
    `DADETO_BUILD_TARGET=production\nOBJECT_MINUTE_RENTAL_SEARCH_URL=${result.endpointUrl}\n`,
    'utf8'
  );
  writeLine(
    `Configured production endpoint from the public registry at ${result.registryHost}; validated keys: ${result.functionKeys.join(', ')}.`
  );
  return 0;
}

/**
 * Require a non-empty workflow environment value.
 * @param {string | undefined} value Candidate value.
 * @param {string} name Environment variable name.
 * @returns {string} Validated value.
 */
function requireEnvironmentValue(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required workflow environment value: ${name}.`);
  }
  return value;
}

/**
 * Validate a numeric GitHub Actions run ID.
 * @param {string | undefined} value Candidate value.
 * @param {string} name Environment variable name.
 * @returns {string} Validated run ID.
 */
function requireDigits(value, name) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new Error(`Workflow environment value ${name} must be a numeric ID.`);
  }
  return value;
}

/**
 * Validate the GitHub Actions source commit SHA.
 * @param {string | undefined} value Candidate commit SHA.
 * @returns {string} Validated commit SHA.
 */
function requireCommitSha(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{40}$/i.test(value)) {
    throw new Error('Workflow environment value GITHUB_SHA must be a commit SHA.');
  }
  return value;
}

function registryStatusError(status) {
  if (status === 403) {
    return 'Registry GET returned 403; allow anonymous object reads for the public registry.';
  }
  if (status === 404) {
    return 'Registry GET returned 404; confirm the production registry object has been applied.';
  }
  return `Registry GET returned ${status}; expected 200.`;
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
      console.error(`::error::${error.message}`);
      process.exitCode = 1;
    });
}
