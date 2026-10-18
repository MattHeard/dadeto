const REQUIRED_FUNCTION_KEYS = ['objectMinuteRentalSearch', 'getAuthorUuidV2'];
const ALLOWED_REGISTRY_KEYS = new Set([
  'schemaVersion',
  'environment',
  'functions',
]);

/**
 * Parse and validate the canonical production function endpoint registry.
 * @param {string} registryJson Serialized registry JSON.
 * @returns {{schemaVersion: 1, environment: 'prod', functions: Record<string, string>}} Valid registry data.
 */
export function parseFunctionEndpointRegistry(registryJson) {
  let manifest;
  try {
    manifest = JSON.parse(registryJson);
  } catch {
    throw new Error('Registry GET returned invalid JSON.');
  }

  if (!isRecord(manifest)) {
    throw new Error('Registry JSON must be an object.');
  }
  for (const key of Object.keys(manifest)) {
    if (!ALLOWED_REGISTRY_KEYS.has(key)) {
      throw new Error(`Registry JSON contains unsupported property: ${key}.`);
    }
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

  for (const requiredFunction of REQUIRED_FUNCTION_KEYS) {
    if (!Object.hasOwn(manifest.functions, requiredFunction)) {
      throw new Error(
        `Registry is missing the ${requiredFunction} function key.`
      );
    }
  }

  /** @type {Record<string, string>} */
  const functions = {};
  for (const [functionName, functionUrl] of Object.entries(
    manifest.functions
  )) {
    if (functionName.trim() === '' || typeof functionUrl !== 'string') {
      throw new Error(
        'Registry function keys must be non-empty and values must be HTTPS URLs.'
      );
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
    functions[functionName] = functionUrl;
  }

  return {
    schemaVersion: manifest.schemaVersion,
    environment: manifest.environment,
    functions,
  };
}

/**
 * Check whether a parsed value is a non-array object.
 * @param {unknown} value Candidate value.
 * @returns {boolean} Whether the value is a record.
 */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
