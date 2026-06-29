import { parseJsonOrNull } from '../../commonCore.js';

/**
 * Resolve the persistence accessor from the toy environment.
 * @param {{ get?: (name: string) => unknown }} env Toy environment helpers.
 * @returns {((value: Record<string, unknown>) => unknown) | null} Persistence setter or null.
 */
export function getStorageAccessor(env) {
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
  if (typeof input !== 'string' || input.trim() === '') {
    return null;
  }

  return parseObjectRecord(input);
}

/**
 * Parse raw JSON or a parsed object into a record.
 * @param {unknown} value Raw JSON or parsed payload.
 * @returns {Record<string, unknown> | null} Parsed object payload.
 */
export function parseObjectRecord(value) {
  if (typeof value === 'string') {
    const parsed = parseJsonOrNull(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return /** @type {Record<string, unknown>} */ (parsed);
    }

    return null;
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return /** @type {Record<string, unknown>} */ (value);
  }

  return null;
}

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

  const payload = { [storageKey]: state };
  if (serializeState) {
    payload[storageKey] = serializeState(state);
  }
  storage(/** @type {Record<string, unknown>} */ (payload));
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
 * Create a rectangle shape payload.
 * @param {{ x: number, y: number, width: number, height: number, fill: string }} shape Rectangle shape details.
 * @returns {Record<string, unknown>} Rectangle shape payload.
 */
export function createRectShape(shape) {
  return {
    type: 'rect',
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    fill: shape.fill,
  };
}
