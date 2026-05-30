import { deepClone } from '../../browser-core.js';
import {
  normalizeMemoryLocation,
  normalizeMemoryPath,
} from './memoryVector.js';

const SUPPORTED_WRITE_LOCATIONS = ['temporary', 'permanent', 'envelope'];

/**
 * Insert or update a scalar or vector value at a nested memory key.
 * Missing intermediate containers are created as objects or arrays.
 * @param {string} input JSON write request.
 * @param {import('../browserToysCore.js').ToyEnv} env Environment helpers.
 * @returns {string} JSON write result.
 */
export function memoryScalarVectorWrite(input, env) {
  const request = parseMemoryWriteRequest(input);
  if (request.error) {
    return JSON.stringify(buildMemoryWriteError(request, request.error));
  }

  return JSON.stringify(writeMemoryValue(request, env));
}

/**
 * Parse and normalize a MEMO3 write request.
 * @param {string} input JSON write request.
 * @returns {{ memoryLocation: string, path: string, value?: unknown, error?: string }} Normalized write request.
 */
function parseMemoryWriteRequest(input) {
  const parsed = parseJsonObject(input);
  if (!parsed.ok) {
    return createMemoryWriteRequest('temporary', '', undefined, parsed.error);
  }

  return normalizeMemoryWriteRequest(parsed.value);
}

/**
 * Normalize parsed JSON into the write request shape.
 * @param {Record<string, unknown>} parsed Parsed request object.
 * @returns {{ memoryLocation: string, path: string, value?: unknown, error?: string }} Normalized write request.
 */
function normalizeMemoryWriteRequest(parsed) {
  const request = createMemoryWriteRequest(
    normalizeMemoryLocation(parsed.memoryLocation),
    normalizeMemoryPath(getPathCandidate(parsed)),
    parsed.value
  );

  return validateMemoryWriteRequest(request, hasValueProperty(parsed));
}

/**
 * Write the requested value into the selected memory location.
 * @param {{ memoryLocation: string, path: string, value: unknown }} request Normalized write request.
 * @param {import('../browserToysCore.js').ToyEnv} env Environment helpers.
 * @returns {{ memoryLocation: string, path: string, written: boolean, value?: unknown, error?: string }} Write result.
 */
function writeMemoryValue(request, env) {
  const writer = getMemoryWriter(request.memoryLocation);
  if (!writer) {
    return buildUnsupportedLocationError(request);
  }

  return runWriteAction(request, () => writer(request, env));
}

/**
 * Execute a memory write and convert thrown errors into structured output.
 * @param {{ memoryLocation: string, path: string, value: unknown }} request Normalized write request.
 * @param {() => unknown} action Write action.
 * @returns {{ memoryLocation: string, path: string, written: boolean, value?: unknown, error?: string }} Write result.
 */
function runWriteAction(request, action) {
  try {
    action();
    return buildMemoryWriteSuccess(request);
  } catch (error) {
    return buildMemoryWriteError(request, formatThrownError(error));
  }
}

/**
 * Write into temporary memory.
 * @param {{ path: string, value: unknown }} request Normalized write request.
 * @param {import('../browserToysCore.js').ToyEnv} env Environment helpers.
 */
function writeTemporaryMemory(request, env) {
  const envelope = readEnvelopeForWriting(env);
  envelope.temporary = writePathValue(
    getContainerRoot(envelope.temporary),
    request
  );
  getRequiredEnvHelper(env, 'setLocalTemporaryData')(envelope);
}

/**
 * Write into permanent memory.
 * @param {{ path: string, value: unknown }} request Normalized write request.
 * @param {import('../browserToysCore.js').ToyEnv} env Environment helpers.
 */
function writePermanentMemory(request, env) {
  const permanent = readPermanentForWriting(env);
  const updated = writePathValue(permanent, request);
  getRequiredEnvHelper(env, 'setLocalPermanentData')(updated);
}

/**
 * Write into the full memory envelope.
 * @param {{ path: string, value: unknown }} request Normalized write request.
 * @param {import('../browserToysCore.js').ToyEnv} env Environment helpers.
 */
function writeEnvelopeMemory(request, env) {
  const envelope = readEnvelopeForWriting(env);
  const updated = writePathValue(envelope, request);
  ensureEnvelopeCanBePersisted(updated);
  getRequiredEnvHelper(env, 'setLocalTemporaryData')(updated);
}

/**
 * Return the writer for a supported memory location.
 * @param {string} memoryLocation Memory location name.
 * @returns {((request: { path: string, value: unknown }, env: import('../browserToysCore.js').ToyEnv) => void) | null} Writer function.
 */
function getMemoryWriter(memoryLocation) {
  const writers = {
    temporary: writeTemporaryMemory,
    permanent: writePermanentMemory,
    envelope: writeEnvelopeMemory,
  };

  return writers[memoryLocation] ?? null;
}

/**
 * Insert a value into a cloned root at the requested path.
 * @param {unknown} root Current memory root.
 * @param {{ path: string, value: unknown }} request Write request.
 * @returns {Record<string, unknown> | unknown[]} Updated root.
 */
function writePathValue(root, request) {
  const segments = getPathSegments(request.path);
  const nextRoot = deepClone(root);
  const writableRoot = getWritableRoot(nextRoot, segments);
  assignNestedValue(writableRoot, segments, request.value);
  return writableRoot;
}

/**
 * Assign the value to the final path segment, creating intermediate containers.
 * @param {Record<string, unknown> | unknown[]} root Writable root.
 * @param {string[]} segments Path segments.
 * @param {unknown} value Value to assign.
 */
function assignNestedValue(root, segments, value) {
  const parent = resolveParentContainer(root, segments);
  assignContainerValue(parent, getLastSegment(segments), value);
}

/**
 * Resolve the parent container that owns the final path segment.
 * @param {Record<string, unknown> | unknown[]} root Writable root.
 * @param {string[]} segments Path segments.
 * @returns {Record<string, unknown> | unknown[]} Parent container.
 */
function resolveParentContainer(root, segments) {
  return segments
    .slice(0, -1)
    .reduce(
      (current, segment, index) =>
        createNextContainer(current, segment, segments[index + 1]),
      root
    );
}

/**
 * Resolve or create the next path container.
 * @param {Record<string, unknown> | unknown[]} current Current container.
 * @param {string} segment Path segment to resolve.
 * @param {string} nextSegment Next path segment.
 * @returns {Record<string, unknown> | unknown[]} Next container.
 */
function createNextContainer(current, segment, nextSegment) {
  const existing = getContainerValue(current, segment);
  if (isContainer(existing)) {
    return existing;
  }

  const nextContainer = createContainerForSegment(nextSegment);
  assignContainerValue(current, segment, nextContainer);
  return nextContainer;
}

/**
 * Get a child value from a container.
 * @param {Record<string, unknown> | unknown[]} container Container to read.
 * @param {string} segment Path segment.
 * @returns {unknown} Child value.
 */
function getContainerValue(container, segment) {
  assertWritableContainerSegment(container, segment);
  return container[segment];
}

/**
 * Assign a child value to a container.
 * @param {Record<string, unknown> | unknown[]} container Container to mutate.
 * @param {string} segment Path segment.
 * @param {unknown} value Value to assign.
 */
function assignContainerValue(container, segment, value) {
  assertWritableContainerSegment(container, segment);
  container[segment] = value;
}

/**
 * Ensure a path segment is writable for the current container type.
 * @param {Record<string, unknown> | unknown[]} container Container to inspect.
 * @param {string} segment Path segment.
 */
function assertWritableContainerSegment(container, segment) {
  if (Array.isArray(container) && !isArrayIndexSegment(segment)) {
    throw new Error(
      `Cannot write non-numeric segment "${segment}" into an array.`
    );
  }
}

/**
 * Read the current state envelope, falling back to an empty temporary envelope.
 * @param {import('../browserToysCore.js').ToyEnv} env Environment helpers.
 * @returns {Record<string, unknown>} Writable state envelope.
 */
function readEnvelopeForWriting(env) {
  const envelope = callOptionalEnvHelper(env, 'getData');
  if (!isObjectRecord(envelope)) {
    return { temporary: {} };
  }

  return deepClone(envelope);
}

/**
 * Read current permanent memory, falling back to an empty object.
 * @param {import('../browserToysCore.js').ToyEnv} env Environment helpers.
 * @returns {Record<string, unknown>} Writable permanent root.
 */
function readPermanentForWriting(env) {
  const permanent = callOptionalEnvHelper(env, 'getLocalPermanentData');
  if (!isObjectRecord(permanent)) {
    return {};
  }

  return deepClone(permanent);
}

/**
 * Ensure the full envelope can pass the temporary-state persistence contract.
 * @param {Record<string, unknown> | unknown[]} envelope Candidate envelope.
 */
function ensureEnvelopeCanBePersisted(envelope) {
  if (!isObjectRecord(envelope) || !Object.hasOwn(envelope, 'temporary')) {
    throw new Error(
      'Envelope writes must preserve an object with a temporary property.'
    );
  }
}

/**
 * Return an object/array root or an empty object for invalid root candidates.
 * @param {unknown} root Memory root candidate.
 * @returns {Record<string, unknown> | unknown[]} Container root.
 */
function getContainerRoot(root) {
  if (isContainer(root)) {
    return deepClone(root);
  }

  return {};
}

/**
 * Choose the root container shape from the first path segment.
 * @param {unknown} root Cloned root candidate.
 * @param {string[]} segments Path segments.
 * @returns {Record<string, unknown> | unknown[]} Writable root.
 */
function getWritableRoot(root, segments) {
  if (isContainer(root)) {
    return root;
  }

  return createContainerForSegment(segments[0]);
}

/**
 * Create the container that should own a path segment.
 * @param {string} segment Upcoming path segment.
 * @returns {Record<string, unknown> | unknown[]} New container.
 */
function createContainerForSegment(segment) {
  if (isArrayIndexSegment(segment)) {
    return [];
  }

  return {};
}

/**
 * Validate a normalized write request.
 * @param {{ memoryLocation: string, path: string, value?: unknown, error?: string }} request Request candidate.
 * @param {boolean} hasValue Whether the input declared a value field.
 * @returns {{ memoryLocation: string, path: string, value?: unknown, error?: string }} Validated request.
 */
function validateMemoryWriteRequest(request, hasValue) {
  if (request.path.length === 0) {
    return addRequestError(request, 'A non-empty path or key is required.');
  }
  if (!hasValue) {
    return addRequestError(request, 'A value property is required.');
  }
  if (!isScalarOrVector(request.value)) {
    return addRequestError(request, 'Value must be a scalar or vector array.');
  }

  return request;
}

/**
 * Determine whether parsed input supplied a value field.
 * @param {Record<string, unknown>} parsed Parsed request object.
 * @returns {boolean} True when the value field exists.
 */
function hasValueProperty(parsed) {
  return Object.hasOwn(parsed, 'value');
}

/**
 * Parse input as a JSON object.
 * @param {string} input JSON candidate.
 * @returns {{ ok: true, value: Record<string, unknown> } | { ok: false, error: string }} Parse result.
 */
function parseJsonObject(input) {
  try {
    return requireParsedObject(JSON.parse(input));
  } catch {
    return { ok: false, error: 'Input must be a JSON object write request.' };
  }
}

/**
 * Require parsed input to be a JSON object.
 * @param {unknown} value Parsed value.
 * @returns {{ ok: true, value: Record<string, unknown> } | { ok: false, error: string }} Parse result.
 */
function requireParsedObject(value) {
  if (isObjectRecord(value)) {
    return { ok: true, value };
  }

  return { ok: false, error: 'Input must be a JSON object write request.' };
}

/**
 * Build a normalized request record.
 * @param {string} memoryLocation Target memory location.
 * @param {string} path Target path.
 * @param {unknown} value Value to write.
 * @param {string} [error] Optional validation error.
 * @returns {{ memoryLocation: string, path: string, value?: unknown, error?: string }} Request record.
 */
function createMemoryWriteRequest(memoryLocation, path, value, error) {
  const request = {
    memoryLocation,
    path,
    value,
  };
  if (error) {
    request.error = error;
  }

  return request;
}

/**
 * Add an error message to a request.
 * @param {{ memoryLocation: string, path: string, value?: unknown }} request Request record.
 * @param {string} error Error message.
 * @returns {{ memoryLocation: string, path: string, value?: unknown, error: string }} Error request.
 */
function addRequestError(request, error) {
  return { ...request, error };
}

/**
 * Build a successful write response.
 * @param {{ memoryLocation: string, path: string, value: unknown }} request Request record.
 * @returns {{ memoryLocation: string, path: string, written: true, value: unknown }} Success response.
 */
function buildMemoryWriteSuccess(request) {
  return {
    memoryLocation: request.memoryLocation,
    path: request.path,
    written: true,
    value: request.value,
  };
}

/**
 * Build an error response.
 * @param {{ memoryLocation: string, path: string, value?: unknown }} request Request record.
 * @param {string} error Error message.
 * @returns {{ memoryLocation: string, path: string, written: false, error: string }} Error response.
 */
function buildMemoryWriteError(request, error) {
  return {
    memoryLocation: request.memoryLocation,
    path: request.path,
    written: false,
    error,
  };
}

/**
 * Build an unsupported-location error response.
 * @param {{ memoryLocation: string, path: string }} request Request record.
 * @returns {{ memoryLocation: string, path: string, written: false, error: string }} Error response.
 */
function buildUnsupportedLocationError(request) {
  return buildMemoryWriteError(
    request,
    `Unsupported memoryLocation "${request.memoryLocation}". Supported locations: ${SUPPORTED_WRITE_LOCATIONS.join(', ')}.`
  );
}

/**
 * Pick the best path candidate from a parsed object.
 * @param {Record<string, unknown>} parsed Parsed request object.
 * @returns {unknown} Path candidate.
 */
function getPathCandidate(parsed) {
  if (parsed.path !== undefined) {
    return parsed.path;
  }

  return parsed.key;
}

/**
 * Split a normalized dot path into segments.
 * @param {string} path Dot path.
 * @returns {string[]} Path segments.
 */
function getPathSegments(path) {
  return path.split('.');
}

/**
 * Return the final segment from a path segment list.
 * @param {string[]} segments Path segments.
 * @returns {string} Final segment.
 */
function getLastSegment(segments) {
  return segments[segments.length - 1];
}

/**
 * Call an optional environment helper if it exists.
 * @param {import('../browserToysCore.js').ToyEnv} env Environment helpers.
 * @param {string} helperName Helper name.
 * @returns {unknown} Helper return value or undefined.
 */
function callOptionalEnvHelper(env, helperName) {
  const helper = getOptionalEnvHelper(env, helperName);
  if (!helper) {
    return undefined;
  }

  return helper();
}

/**
 * Get an optional environment helper.
 * @param {import('../browserToysCore.js').ToyEnv} env Environment helpers.
 * @param {string} helperName Helper name.
 * @returns {Function | null} Helper function or null.
 */
function getOptionalEnvHelper(env, helperName) {
  const helper = env.get(helperName);
  if (typeof helper === 'function') {
    return helper;
  }

  return null;
}

/**
 * Get a required environment helper.
 * @param {import('../browserToysCore.js').ToyEnv} env Environment helpers.
 * @param {string} helperName Helper name.
 * @returns {Function} Helper function.
 */
function getRequiredEnvHelper(env, helperName) {
  const helper = getOptionalEnvHelper(env, helperName);
  if (!helper) {
    throw new Error(`Missing toy helper "${helperName}"`);
  }

  return helper;
}

/**
 * Determine whether a value can be assigned by MEMO3.
 * @param {unknown} value Candidate value.
 * @returns {boolean} True when scalar or vector.
 */
function isScalarOrVector(value) {
  return isScalar(value) || Array.isArray(value);
}

/**
 * Determine whether a value is a JSON scalar.
 * @param {unknown} value Candidate value.
 * @returns {boolean} True when scalar.
 */
function isScalar(value) {
  return (
    value === null || ['string', 'number', 'boolean'].includes(typeof value)
  );
}

/**
 * Determine whether a value is a writable object or array container.
 * @param {unknown} value Candidate value.
 * @returns {value is Record<string, unknown> | unknown[]} True when object or array.
 */
function isContainer(value) {
  return Array.isArray(value) || isObjectRecord(value);
}

/**
 * Determine whether a value is a non-array object record.
 * @param {unknown} value Candidate value.
 * @returns {value is Record<string, unknown>} True when non-null object record.
 */
function isObjectRecord(value) {
  return typeof value === 'object' && Boolean(value) && !Array.isArray(value);
}

/**
 * Determine whether a path segment is a valid array index.
 * @param {string} segment Path segment.
 * @returns {boolean} True when segment can index an array.
 */
function isArrayIndexSegment(segment) {
  const index = Number(segment);
  return Number.isInteger(index) && index >= 0 && String(index) === segment;
}

/**
 * Format a thrown value as a string.
 * @param {unknown} error Thrown value.
 * @returns {string} Error message.
 */
function formatThrownError(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export const memoryScalarVectorWriteTestOnly = {
  assignNestedValue,
  buildMemoryWriteError,
  buildMemoryWriteSuccess,
  createContainerForSegment,
  getMemoryWriter,
  ensureEnvelopeCanBePersisted,
  isScalarOrVector,
  parseMemoryWriteRequest,
  writePathValue,
};
