import { parseObjectRecord as parseRecord } from '../validation.js';
import { createRectShape } from '../canvasShapes.js';

export { createRectShape };

/**
 * Resolve the persistence accessor from the toy environment.
 * @param {{ get?: (name: string) => unknown } | null | undefined} env Toy environment helpers.
 * @returns {((value: Record<string, unknown>) => unknown) | null} Persistence setter or null.
 */
export function getStorageAccessor(env) {
  // Stryker disable next-line all -- malformed environments are defensive boundaries.
  if (!env || typeof env.get !== 'function') {
    return null;
  }

  const setter = env.get('setLocalPermanentData');
  if (typeof setter !== 'function') {
    return null;
  }

  return /** @type {(value: Record<string, unknown>) => unknown} */ (setter);
}

/**
 * Read and normalize persisted state from storage.
 * @template T
 * @param {((value: Record<string, unknown>) => unknown) | null} storage Persistence setter.
 * @param {string} storageKey Local storage key.
 * @param {(value: unknown) => T | null} normalizeState Normalizer for stored state.
 * @returns {T | null} Normalized stored state.
 */
export function readPersistedState(storage, storageKey, normalizeState) {
  if (!storage) {
    return null;
  }

  const stored = storage({});
  if (!stored || typeof stored !== 'object') {
    return null;
  }

  const record = /** @type {Record<string, unknown>} */ (stored);
  return normalizeState(record[storageKey]);
}

/**
 * Parse a raw input payload into an object record.
 * @param {string} input Raw JSON input.
 * @returns {Record<string, unknown> | null} Parsed object or null.
 */
export function parseInput(input) {
  // Stryker disable next-line all -- the toy contract supplies strings; non-string input is defensive handling.
  if (typeof input !== 'string' || input.trim() === '') {
    return null;
  }

  return parseRecord(input);
}

/**
 * Coerce a value to an object record.
 * @param {unknown} value Failure value.
 * @returns {Record<string, unknown> | null} Object record or null.
 */
export { parseRecord as parseObjectRecord };

/**
 * Persist the current state when storage is available.
 * @template TState
 * @param {((value: Record<string, unknown>) => unknown) | null} storage Persistence setter.
 * @param {string} storageKey Local storage key.
 * @param {TState} state State to persist.
 * @param {(state: TState) => unknown} [serializeState] State serializer.
 * @returns {void}
 */
export function persistState(storage, storageKey, state, serializeState) {
  if (!storage) {
    return;
  }

  const payload = /** @type {Record<string, unknown>} */ ({
    [storageKey]: state,
  });
  if (serializeState) {
    payload[storageKey] = serializeState(state);
  }
  storage(payload);
}

/**
 * Run a toy with standard persistence wiring.
 * @template TState
 * @param {string} input Raw JSON input.
 * @param {{ get?: (name: string) => unknown }} env Toy environment helpers.
 * @param {{
 *   storageKey: string,
 *   normalizeState: (value: unknown) => TState | null,
 *   buildNextState: (persisted: TState | null, input: Record<string, unknown> | null) => TState,
 *   toCanvasPayload: (state: TState) => string,
 * }} options Toy persistence options.
 * @returns {string} Serialized canvas payload.
 */
export function runToy(input, env, options) {
  const storage = getStorageAccessor(env);
  const persisted = readPersistedState(
    storage,
    options.storageKey,
    options.normalizeState
  );
  const parsed = parseInput(input);
  const state = options.buildNextState(persisted, parsed);
  persistState(storage, options.storageKey, state);
  return options.toCanvasPayload(state);
}

/**
 * Create a full-size background rectangle shape payload.
 * @param {number} width Background width.
 * @param {number} height Background height.
 * @param {string} fill Background fill color.
 * @returns {Record<string, unknown>} Rectangle shape payload.
 */
export function createBackgroundShape(width, height, fill) {
  return createRectShape({ x: 0, y: 0, width, height, fill });
}
