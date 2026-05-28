import { get } from '../2025-03-29/get.js';
import { requireEnvHelper } from '../browserToysCore.js';
/** @typedef {import('../browserToysCore.js').ToyEnv} ToyEnv */

const DEFAULT_MEMORY_LOCATION = 'temporary';
const SUPPORTED_MEMORY_LOCATIONS = ['temporary', 'permanent', 'envelope'];

/**
 * Read a memory location and project the selected value as a vector.
 * Scalars become singleton vectors and arrays preserve their shape.
 * @param {string} input JSON config or a plain dot-path string.
 * @param {ToyEnv} env Environment helpers.
 * @returns {string} JSON string describing the memory projection.
 */
export function memoryVector(input, env) {
  const request = parseMemoryVectorRequest(input);
  if (request.error) {
    return JSON.stringify(buildMemoryVectorError(request, request.error));
  }

  return JSON.stringify(buildMemoryVectorResponseWithFallback(request, env));
}

/**
 * Parse the toy input into a normalized memory request.
 * @param {string} input Toy payload.
 * @returns {{ memoryLocation: string, path: string, error?: string }} Normalized request.
 */
function parseMemoryVectorRequest(input) {
  const trimmed = trimInput(input);
  if (isEmptyInput(trimmed)) {
    return createMemoryVectorRequest(DEFAULT_MEMORY_LOCATION, '');
  }

  return parseNonEmptyMemoryVectorRequest(trimmed);
}

/**
 * Build a request record from a non-empty input string.
 * @param {string} trimmed Non-empty trimmed input.
 * @returns {{ memoryLocation: string, path: string, error?: string }} Normalized request.
 */
function parseNonEmptyMemoryVectorRequest(trimmed) {
  const parsedResult = tryParseJson(trimmed);
  if (!parsedResult.ok) {
    return createMemoryVectorRequest(DEFAULT_MEMORY_LOCATION, trimmed);
  }

  return parseParsedMemoryVectorRequest(parsedResult.value);
}

/**
 * Build a request record from a parsed JSON value.
 * @param {unknown} parsed Parsed JSON value.
 * @returns {{ memoryLocation: string, path: string, error?: string }} Normalized request.
 */
function parseParsedMemoryVectorRequest(parsed) {
  if (typeof parsed === 'string') {
    return createMemoryVectorRequest(DEFAULT_MEMORY_LOCATION, parsed.trim());
  }

  return parseObjectMemoryVectorRequest(parsed);
}

/**
 * Build a request record from a parsed JSON object.
 * @param {unknown} parsed Parsed JSON value.
 * @returns {{ memoryLocation: string, path: string, error?: string }} Normalized request.
 */
function parseObjectMemoryVectorRequest(parsed) {
  if (!isPlainObject(parsed)) {
    return {
      memoryLocation: DEFAULT_MEMORY_LOCATION,
      path: '',
      error: 'Input must be a JSON object or a string path.',
    };
  }

  return createMemoryVectorRequest(
    normalizeMemoryLocation(parsed.memoryLocation),
    normalizeMemoryPath(getPathCandidate(parsed))
  );
}

/**
 * Normalize the memory location selector.
 * @param {unknown} value Requested memory location.
 * @returns {string} Supported memory location label.
 */
function normalizeMemoryLocation(value) {
  return fallbackIfEmpty(trimInput(value), DEFAULT_MEMORY_LOCATION);
}

/**
 * Normalize the requested memory path.
 * @param {unknown} value Path candidate.
 * @returns {string} Dot-separated path.
 */
function normalizeMemoryPath(value) {
  return trimInput(value);
}

/**
 * Resolve the selected memory location into a root object.
 * @param {string} memoryLocation Requested memory location.
 * @param {ToyEnv} env Environment helpers.
 * @returns {{ root?: object | unknown[], error?: string }} Selected root or error.
 */
function readMemoryRoot(memoryLocation, env) {
  const reader = MEMORY_ROOT_READERS[memoryLocation];
  if (!reader) {
    return buildUnsupportedMemoryLocationResult(memoryLocation);
  }

  return reader(env);
}

/**
 * Map supported memory locations to their root readers.
 * @type {Record<string, (env: ToyEnv) => { root?: object | unknown[], error?: string }>}
 */
const MEMORY_ROOT_READERS = {
  temporary: readTemporaryMemoryRoot,
  permanent: readPermanentMemoryRoot,
  envelope: readEnvelopeMemoryRoot,
};

/**
 * Build an unsupported location error payload.
 * @param {string} memoryLocation Requested memory location.
 * @returns {{ error: string }} Error payload.
 */
function buildUnsupportedMemoryLocationResult(memoryLocation) {
  return {
    error: `Unsupported memoryLocation "${memoryLocation}". Supported locations: ${SUPPORTED_MEMORY_LOCATIONS.join(', ')}.`,
  };
}

/**
 * Try to build a vector response and fall back to an error payload when the runtime throws.
 * @param {{ memoryLocation: string, path: string }} request Normalized request.
 * @param {ToyEnv} env Environment helpers.
 * @returns {{ memoryLocation: string, path: string, found: boolean, vector: unknown[], error?: string }} Structured response.
 */
function buildMemoryVectorResponseWithFallback(request, env) {
  try {
    return buildMemoryVectorResponse(request, env);
  } catch (error) {
    return buildMemoryVectorError(
      request,
      formatThrownError(error),
      request.memoryLocation
    );
  }
}

/**
 * Build the structured vector payload after the input has been validated.
 * @param {{ memoryLocation: string, path: string }} request Normalized request.
 * @param {ToyEnv} env Environment helpers.
 * @returns {{ memoryLocation: string, path: string, found: boolean, vector: unknown[], error?: string }} Structured response.
 */
function buildMemoryVectorResponse(request, env) {
  return buildMemoryVectorResponseFromRootResult(
    request,
    readMemoryRoot(request.memoryLocation, env)
  );
}

/**
 * Resolve the root lookup result into either an error response or a path lookup.
 * @param {{ memoryLocation: string, path: string }} request Normalized request.
 * @param {{ root?: object | unknown[], error?: string }} rootResult Root lookup result.
 * @returns {{ memoryLocation: string, path: string, found: boolean, vector: unknown[], error?: string }} Structured response.
 */
function buildMemoryVectorResponseFromRootResult(request, rootResult) {
  if (rootResult.error) {
    return buildMemoryVectorError(
      request,
      rootResult.error,
      request.memoryLocation
    );
  }

  return buildMemoryVectorResponseFromRoot(request, rootResult.root);
}

/**
 * Resolve the selected root into a path lookup or a root-missing error.
 * @param {{ memoryLocation: string, path: string }} request Normalized request.
 * @param {object | unknown[] | undefined} root Memory root to inspect.
 * @returns {{ memoryLocation: string, path: string, found: boolean, vector: unknown[], error?: string }} Structured response.
 */
function buildMemoryVectorResponseFromRoot(request, root) {
  if (root === undefined) {
    return buildMemoryVectorError(
      request,
      'Error: Memory root lookup returned no value.',
      request.memoryLocation
    );
  }

  return buildResolvedMemoryVectorResponse(request, root);
}

/**
 * Build the structured vector payload once the memory root is available.
 * @param {{ memoryLocation: string, path: string }} request Normalized request.
 * @param {object | unknown[]} root Memory root to inspect.
 * @returns {{ memoryLocation: string, path: string, found: boolean, vector: unknown[], error?: string }} Structured response.
 */
function buildResolvedMemoryVectorResponse(request, root) {
  return buildResolvedMemoryVectorResponseFromPath(
    request,
    resolveMemoryPath(root, request.path)
  );
}

/**
 * Resolve the path lookup into either an error or a projected vector.
 * @param {{ memoryLocation: string, path: string }} request Normalized request.
 * @param {{ value?: unknown, error?: string }} resolvedValue Lookup result.
 * @returns {{ memoryLocation: string, path: string, found: boolean, vector: unknown[], error?: string }} Structured response.
 */
function buildResolvedMemoryVectorResponseFromPath(request, resolvedValue) {
  if (resolvedValue.error) {
    return buildMemoryVectorError(
      request,
      resolvedValue.error,
      request.memoryLocation
    );
  }

  return buildResolvedMemoryVectorResponseFromValue(
    request,
    resolvedValue.value
  );
}

/**
 * Project a resolved path value into the final response payload.
 * @param {{ memoryLocation: string, path: string }} request Normalized request.
 * @param {unknown} value Resolved path value.
 * @returns {{ memoryLocation: string, path: string, found: boolean, vector: unknown[], error?: string }} Structured response.
 */
function buildResolvedMemoryVectorResponseFromValue(request, value) {
  if (value === undefined) {
    return buildMemoryVectorError(
      request,
      'Error: Memory path resolution returned no value.',
      request.memoryLocation
    );
  }

  return {
    memoryLocation: request.memoryLocation,
    path: request.path,
    found: true,
    vector: projectToVector(value),
  };
}

/**
 * Read the current temporary memory envelope.
 * @param {ToyEnv} env Environment helpers.
 * @returns {{ root?: object | unknown[], error?: string }} Temporary state or error.
 */
function readTemporaryMemoryRoot(env) {
  const getData = getRequiredEnvHelper(env, 'getData');
  const envelope = getData();
  if (!isObjectLike(envelope)) {
    return {
      error: "Error: 'getData' did not return a valid object or array.",
    };
  }

  const temporary = /** @type {{ temporary?: object | unknown[] }} */ (envelope)
    .temporary;
  return {
    root: getTemporaryRoot(temporary),
  };
}

/**
 * Read the full current data envelope.
 * @param {ToyEnv} env Environment helpers.
 * @returns {{ root?: object | unknown[], error?: string }} Envelope state or error.
 */
function readEnvelopeMemoryRoot(env) {
  const getData = getRequiredEnvHelper(env, 'getData');
  const envelope = getData();
  if (!isObjectLike(envelope)) {
    return {
      error: "Error: 'getData' did not return a valid object or array.",
    };
  }

  return {
    root: envelope,
  };
}

/**
 * Read the persistent local memory bucket.
 * @param {ToyEnv} env Environment helpers.
 * @returns {{ root?: object | unknown[], error?: string }} Permanent state or error.
 */
function readPermanentMemoryRoot(env) {
  const getLocalPermanentData = getRequiredEnvHelper(
    env,
    'getLocalPermanentData'
  );
  const permanent = getLocalPermanentData();
  if (!isObjectLike(permanent)) {
    return {
      error:
        "Error: 'getLocalPermanentData' did not return a valid object or array.",
    };
  }

  return {
    root: permanent,
  };
}

/**
 * Resolve a path inside the selected memory root using the repo's existing path reader.
 * @param {object | unknown[]} root Memory root to inspect.
 * @param {string} path Dot path within the memory root.
 * @returns {{ value?: unknown, error?: string }} Lookup result.
 */
function resolveMemoryPath(root, path) {
  const resolved = get(
    path,
    /** @type {ToyEnv} */ (new Map([['getData', () => root]]))
  );
  if (!isStringValue(resolved)) {
    return { value: resolved };
  }
  return resolveStringMemoryPath(resolved);
}

/**
 * Resolve a string lookup result into a parsed value or error.
 * @param {string} resolved String lookup result.
 * @returns {{ value?: unknown, error?: string }} Lookup result.
 */
function resolveStringMemoryPath(resolved) {
  if (isMemoryPathError(resolved)) {
    return { error: resolved };
  }

  return { value: JSON.parse(resolved) };
}

/**
 * Wrap scalar results in a vector while preserving array/tensor shapes.
 * @param {unknown} value Value to project.
 * @returns {unknown[]} Vector projection.
 */
function projectToVector(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}

/**
 * Build a structured error response.
 * @param {{ memoryLocation: string, path: string }} request Normalized request.
 * @param {string} error Error message to surface.
 * @param {string} [memoryLocation] Memory location that triggered the error.
 * @returns {{ memoryLocation: string, path: string, found: boolean, vector: never[], error: string }} Error payload.
 */
function buildMemoryVectorError(
  request,
  error,
  memoryLocation = request.memoryLocation
) {
  return {
    memoryLocation,
    path: request.path,
    found: false,
    vector: [],
    error,
  };
}

/**
 * Require a helper from the toy environment.
 * @param {ToyEnv} env Environment helpers.
 * @param {string} key Helper name.
 * @returns {Function} Helper function.
 */
function getRequiredEnvHelper(env, key) {
  return requireEnvHelper(env, key);
}

/**
 * Determine whether the value is an object-like data container.
 * @param {unknown} value Candidate value.
 * @returns {boolean} True when the value can act as a memory root.
 */
function isObjectLike(value) {
  return Boolean(value) && typeof value === 'object';
}

/**
 * Determine whether a value is a plain object.
 * @param {unknown} value Candidate value.
 * @returns {value is Record<string, unknown>} True when the value is a plain object.
 */
function isPlainObject(value) {
  return Boolean(value) && Object.getPrototypeOf(value) === Object.prototype;
}

/**
 * Trim a full input payload or return an empty string for non-string values.
 * @param {unknown} value Input candidate.
 * @returns {string} Trimmed input text.
 */
function trimInput(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

/**
 * Determine whether the provided input is empty after trimming.
 * @param {string} value Input text.
 * @returns {boolean} True when the input has no visible characters.
 */
function isEmptyInput(value) {
  return value.length === 0;
}

/**
 * Parse JSON safely and report whether parsing succeeded.
 * @param {string} value JSON candidate.
 * @returns {{ ok: boolean, value?: unknown }} Parse result.
 */
function tryParseJson(value) {
  try {
    return {
      ok: true,
      value: JSON.parse(value),
    };
  } catch {
    return {
      ok: false,
    };
  }
}

/**
 * Create a normalized request record.
 * @param {string} memoryLocation Selected memory location.
 * @param {string} path Selected path.
 * @returns {{ memoryLocation: string, path: string }} Normalized request record.
 */
function createMemoryVectorRequest(memoryLocation, path) {
  return {
    memoryLocation,
    path,
  };
}

/**
 * Return the fallback value when the provided text is empty.
 * @param {string} value Candidate text.
 * @param {string} fallback Fallback text.
 * @returns {string} Either the candidate text or the fallback.
 */
function fallbackIfEmpty(value, fallback) {
  if (value.length === 0) {
    return fallback;
  }

  return value;
}

/**
 * Determine whether a resolved lookup is a string value.
 * @param {unknown} value Lookup result.
 * @returns {boolean} True when the lookup returned a string.
 */
function isStringValue(value) {
  return typeof value === 'string';
}

/**
 * Determine whether a resolved path value is an error string.
 * @param {string} value Resolved lookup value.
 * @returns {boolean} True when the lookup returned an error string.
 */
function isMemoryPathError(value) {
  return value.startsWith('Error:') || value.startsWith('Error during');
}

/**
 * Return the temporary root bucket when available.
 * @param {object | unknown[] | undefined} temporary Temporary bucket candidate.
 * @returns {object | unknown[]} Valid temporary root or an empty object.
 */
function getTemporaryRoot(temporary) {
  if (isObjectLike(temporary)) {
    return /** @type {object | unknown[]} */ (temporary);
  }

  return {};
}

/**
 * Pick the best path candidate from a parsed object.
 * @param {Record<string, unknown>} parsed Parsed request object.
 * @returns {unknown} Selected path candidate.
 */
function getPathCandidate(parsed) {
  if (parsed.path !== undefined) {
    return parsed.path;
  }

  return parsed.key;
}

/**
 * Format a thrown value into a human-readable message.
 * @param {unknown} error Thrown value.
 * @returns {string} Error message.
 */
function formatThrownError(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export const memoryVectorTestOnly = {
  buildMemoryVectorError,
  buildMemoryVectorResponseFromRoot,
  buildResolvedMemoryVectorResponseFromValue,
  normalizeMemoryLocation,
  normalizeMemoryPath,
  parseMemoryVectorRequest,
  projectToVector,
  readEnvelopeMemoryRoot,
  readMemoryPath: resolveMemoryPath,
  readMemoryRoot,
  readPermanentMemoryRoot,
  readTemporaryMemoryRoot,
};
