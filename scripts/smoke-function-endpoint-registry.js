import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const REQUEST_TIMEOUT_MS = 15_000;
const REQUIRED_FUNCTIONS = ['objectMinuteRentalSearch', 'getAuthorUuidV2'];

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
  const endpoint = parseRegistryUrl(registryUrl);
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
  const functionHosts = validateManifest(manifest);

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

function parseRegistryUrl(registryUrl) {
  let endpoint;
  try {
    endpoint = new URL(registryUrl);
  } catch {
    throw new Error(
      'FUNCTION_ENDPOINT_REGISTRY_URL must be a stable HTTPS GCS registry URL.'
    );
  }

  const pathSegments = endpoint.pathname.split('/').filter(Boolean);
  if (
    endpoint.protocol !== 'https:' ||
    endpoint.hostname !== 'storage.googleapis.com' ||
    endpoint.username !== '' ||
    endpoint.password !== '' ||
    endpoint.search !== '' ||
    endpoint.hash !== '' ||
    pathSegments.length !== 2 ||
    pathSegments[0].trim() === '' ||
    pathSegments[1] !== 'function-endpoints.json'
  ) {
    throw new Error(
      'FUNCTION_ENDPOINT_REGISTRY_URL must be an HTTPS storage.googleapis.com bucket/function-endpoints.json URL.'
    );
  }
  return endpoint;
}

async function readRegistryJson(response) {
  try {
    return await response.json();
  } catch {
    throw new Error('Registry GET returned invalid JSON.');
  }
}

function validateManifest(manifest) {
  if (!isRecord(manifest)) {
    throw new Error('Registry JSON must be an object.');
  }
  if (manifest.schemaVersion !== 1) {
    throw new Error('Registry schemaVersion must be 1.');
  }
  if (manifest.environment !== 'prod') {
    throw new Error('Registry environment must be prod.');
  }
  if (!isRecord(manifest.functions)) {
    throw new Error('Registry functions must be an object.');
  }

  for (const requiredFunction of REQUIRED_FUNCTIONS) {
    if (!Object.hasOwn(manifest.functions, requiredFunction)) {
      throw new Error(`Registry is missing the ${requiredFunction} function key.`);
    }
  }

  const functionHosts = {};
  for (const [functionName, functionUrl] of Object.entries(manifest.functions)) {
    if (functionName.trim() === '' || typeof functionUrl !== 'string') {
      throw new Error('Registry function keys must be non-empty and values must be HTTPS URLs.');
    }
    let parsedFunctionUrl;
    try {
      parsedFunctionUrl = new URL(functionUrl);
    } catch {
      throw new Error(`Registry URL for ${functionName} is invalid.`);
    }
    if (
      parsedFunctionUrl.protocol !== 'https:' ||
      parsedFunctionUrl.username !== '' ||
      parsedFunctionUrl.password !== ''
    ) {
      throw new Error(`Registry URL for ${functionName} must use HTTPS.`);
    }
    functionHosts[functionName] = parsedFunctionUrl.host;
  }
  return functionHosts;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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
