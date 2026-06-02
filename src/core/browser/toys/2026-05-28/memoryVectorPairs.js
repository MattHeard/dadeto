import {
  buildMemoryVectorError,
  buildMemoryVectorResponseFromRoot,
  buildMemoryVectorResponseWithFallback,
  buildResolvedMemoryVectorResponseFromValue,
  normalizeMemoryLocation,
  normalizeMemoryPath,
  parseMemoryVectorRequest,
  projectArrayOrSingletonToVector,
  readEnvelopeMemoryRoot,
  readMemoryPath,
  readMemoryRoot,
  readPermanentMemoryRoot,
  readTemporaryMemoryRoot,
} from './memoryVector.js';

/**
 * Read a memory location and project the selected value as a vector of
 * key-value pairs when the selected value is an object.
 * @param {string} input JSON config or a plain dot-path string.
 * @param {import('../browserToysCore.js').ToyEnv} env Environment helpers.
 * @returns {string} JSON string describing the memory projection.
 */
export function memoryVectorPairs(input, env) {
  return JSON.stringify(
    resolveMemoryVectorPairsResponse(parseMemoryVectorRequest(input), env)
  );
}

/**
 * Resolve the request into a JSON-serializable response for the pair variant.
 * @param {{ memoryLocation: string, path: string, error?: string }} request Normalized request.
 * @param {import('../browserToysCore.js').ToyEnv} env Environment helpers.
 * @returns {{ memoryLocation: string, path: string, found: boolean, vector: unknown[], error?: string }} Structured response.
 */
function resolveMemoryVectorPairsResponse(request, env) {
  if (request.error) {
    return buildMemoryVectorError(request, request.error);
  }

  return buildMemoryVectorPairsResponse(request, env);
}

/**
 * Build the key-value-pair projection response after the request has been
 * normalized.
 * @param {{ memoryLocation: string, path: string }} request Normalized request.
 * @param {import('../browserToysCore.js').ToyEnv} env Environment helpers.
 * @returns {{ memoryLocation: string, path: string, found: boolean, vector: unknown[], error?: string }} Structured response.
 */
function buildMemoryVectorPairsResponse(request, env) {
  return buildMemoryVectorResponseWithFallback(request, env, {
    projectToVector,
    resolvePathError: resolvePathErrorForPairs,
  });
}

/**
 * Convert a path error into an empty-vector response for missing values or a
 * hard error for all other lookup failures.
 * @param {{ memoryLocation: string, path: string }} request Normalized request.
 * @param {string} error Lookup error.
 * @returns {{ memoryLocation: string, path: string, found: boolean, vector: unknown[], error?: string }} Structured response.
 */
function resolvePathErrorForPairs(request, error) {
  if (isMissingMemoryPathError(error)) {
    return {
      memoryLocation: request.memoryLocation,
      path: request.path,
      found: false,
      vector: [],
    };
  }

  return buildMemoryVectorError(request, error, request.memoryLocation);
}

/**
 * Wrap scalars in singleton vectors while projecting objects to key-value
 * pair vectors.
 * @param {unknown} value Value to project.
 * @returns {unknown[]} Vector projection.
 */
function projectToVector(value) {
  return projectObjectOrScalarToVector(value);
}

/**
 * Project a non-array value into either an object-pair vector or singleton vector.
 * @param {unknown} value Value to project.
 * @returns {unknown[]} Vector projection.
 */
function projectObjectOrScalarToVector(value) {
  if (Array.isArray(value)) {
    return projectArrayOrSingletonToVector(value);
  }

  if (isObjectLike(value)) {
    return projectObjectToVector(/** @type {object} */ (value));
  }

  return projectArrayOrSingletonToVector(value);
}

/**
 * Convert an object into a vector of key-value pairs.
 * @param {object} value Object value to project.
 * @returns {{ key: string, value: unknown }[]} Key-value vector projection.
 */
function projectObjectToVector(value) {
  return Object.entries(value).map(([key, entryValue]) => ({
    key,
    value: entryValue,
  }));
}

/**
 * Determine whether a lookup error represents a missing path segment.
 * @param {string} value Resolved lookup error.
 * @returns {boolean} True when the lookup failed because the segment was missing.
 */
function isMissingMemoryPathError(value) {
  return value.startsWith("Error: Path segment '");
}

/**
 * Determine whether a value is object-like enough to inspect with Object.entries.
 * @param {unknown} value Candidate object.
 * @returns {value is Record<string, unknown>} True when the value is an object record.
 */
function isObjectLike(value) {
  return typeof value === 'object' && Boolean(value);
}

export const memoryVectorPairsTestOnly = {
  buildMemoryVectorError,
  buildMemoryVectorResponseFromRoot,
  buildResolvedMemoryVectorResponseFromValue,
  normalizeMemoryLocation,
  normalizeMemoryPath,
  parseMemoryVectorRequest,
  projectToVector,
  projectArrayOrSingletonToVector,
  projectObjectToVector,
  projectObjectOrScalarToVector,
  readEnvelopeMemoryRoot,
  readMemoryPath,
  readMemoryRoot,
  readPermanentMemoryRoot,
  readTemporaryMemoryRoot,
};
