import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseFunctionEndpointRegistry } from '../src/core/build/function-endpoint-registry.js';
import { parseFunctionEndpointRegistryUrl } from './parse-function-endpoint-registry-url.js';

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Fetch and validate the public production function endpoint registry.
 * @param {{ registryUrl: string, fetchFn?: typeof fetch, timeoutSignal?: (milliseconds: number) => AbortSignal }} options Smoke-check dependencies.
 * @returns {Promise<{ registryHost: string, status: number, schemaVersion: 1, environment: 'prod', functionKeys: string[], functionHosts: Record<string, string>, cacheControl: string }>} Redacted validation evidence.
 */
export async function runFunctionEndpointRegistrySmoke({
  registryUrl,
  fetchFn = globalThis.fetch,
  timeoutSignal = AbortSignal.timeout,
}) {
  const endpoint = parseFunctionEndpointRegistryUrl(registryUrl);
  if (typeof fetchFn !== 'function') {
    throw new Error('This Node.js version does not provide fetch.');
  }

  const response = await fetchWithoutLeakingRequestData(
    fetchFn,
    endpoint.href,
    {
      method: 'GET',
      redirect: 'error',
      headers: { Accept: 'application/json' },
      signal: timeoutSignal(REQUEST_TIMEOUT_MS),
    }
  );
  if (response.status !== 200) {
    throw new Error(`Registry GET returned ${response.status}; expected 200.`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    throw new Error('Registry GET did not return application/json.');
  }
  const cacheControl = response.headers.get('cache-control') ?? '';
  if (!/(?:^|,)\s*no-store\s*(?:,|$)/i.test(cacheControl)) {
    throw new Error('Registry response is missing Cache-Control: no-store.');
  }

  const manifest = await readRegistryJson(response);
  const functionHosts = Object.fromEntries(
    Object.entries(manifest.functions).map(([functionName, functionUrl]) => [
      functionName,
      new URL(functionUrl).host,
    ])
  );

  return {
    registryHost: endpoint.host,
    status: response.status,
    schemaVersion: manifest.schemaVersion,
    environment: manifest.environment,
    functionKeys: Object.keys(functionHosts).sort(),
    functionHosts,
    cacheControl,
  };
}

/**
 * Keep the command inert unless the operator explicitly requests the public GET.
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
      'After the registry production apply is authorized, set FUNCTION_ENDPOINT_REGISTRY_URL and run this file with --execute.'
    );
    writeLine(
      'The command performs one anonymous GET and prints only registry keys and endpoint hosts.'
    );
    return 0;
  }
  if (!argv.includes('--execute')) {
    writeLine('No requests sent. Pass --execute only after the registry is applied and ready for public read.');
    return 0;
  }

  const result = await runFunctionEndpointRegistrySmoke({
    registryUrl: environment.FUNCTION_ENDPOINT_REGISTRY_URL,
    fetchFn,
    timeoutSignal,
  });
  writeLine(`function endpoint registry smoke passed: ${JSON.stringify(result)}`);
  return 0;
}

async function fetchWithoutLeakingRequestData(fetchFn, url, options) {
  try {
    return await fetchFn(url, options);
  } catch {
    throw new Error('Registry GET failed before a response was received.');
  }
}

async function readRegistryJson(response) {
  let registryJson;
  try {
    registryJson = await response.text();
  } catch {
    throw new Error('Registry GET returned invalid JSON.');
  }
  return parseFunctionEndpointRegistry(registryJson);
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
