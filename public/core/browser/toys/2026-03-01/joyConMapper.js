import { isNonNullObject, isValidString } from '../../../commonCore.js';
import { parseJsonObject } from '../../jsonValueHelpers.js';

const TOY_STORAGE_KEY = 'JOYMAP1';
const DEFAULT_STATE = {
  mappings: {},
  skippedControls: [],
};

/**
 * @param {string} input Serialized Joy-Con mapper action payload.
 * @returns {Record<string, unknown> | null} Parsed JSON value or null on parse failure.
 */
function parseJsonInput(input) {
  return parseJsonObject(input);
}

/**
 * @param {string} input Serialized Joy-Con mapper action payload.
 * @returns {Record<string, unknown> | null} Parsed action object or null for invalid input.
 */
function parseInput(input) {
  if (!isValidString(input)) {
    return null;
  }

  return parseJsonInput(input);
}

/**
 * @param {unknown} mappings Stored mapping payload from local permanent data.
 * @returns {Record<string, unknown>} Normalized mappings object.
 */
function normalizeMappings(mappings) {
  if (!isNonNullObject(mappings)) {
    return {};
  }

  return /** @type {Record<string, unknown>} */ (mappings);
}

/**
 * @param {unknown} skippedControls Stored skipped-controls payload from local permanent data.
 * @returns {string[]} Normalized skipped control list.
 */
function normalizeSkippedControls(skippedControls) {
  if (!Array.isArray(skippedControls)) {
    return [];
  }

  return skippedControls;
}

/**
 * @param {{ get: (name: string) => unknown }} env Toy runtime environment.
 * @returns {(() => Record<string, unknown> | null | undefined) | null} Local data getter when available.
 */
function getLocalPermanentDataGetter(env) {
  const getLocalPermanentData = env.get('getLocalPermanentData');
  if (typeof getLocalPermanentData !== 'function') {
    return null;
  }

  return getLocalPermanentData;
}

/**
 * @param {Record<string, unknown> | null | undefined} value Candidate local permanent data root.
 * @returns {Record<string, unknown>} Normalized local permanent data root.
 */
function normalizeLocalPermanentDataRoot(value) {
  return value ?? {};
}

/**
 * @param {(() => Record<string, unknown> | null | undefined) | null} getLocalPermanentData Local data getter when available.
 * @returns {Record<string, unknown>} Local permanent data root.
 */
function getLocalPermanentDataRoot(getLocalPermanentData) {
  if (!getLocalPermanentData) {
    return {};
  }

  return normalizeLocalPermanentDataRoot(getLocalPermanentData());
}

/**
 * @param {{ get: (name: string) => unknown }} env Toy runtime environment.
 * @returns {unknown} Stored Joy-Con mapper state candidate.
 */
function getStoredValue(env) {
  const getLocalPermanentData = getLocalPermanentDataGetter(env);
  return getLocalPermanentDataRoot(getLocalPermanentData)[TOY_STORAGE_KEY];
}

/**
 * @param {{ get: (name: string) => unknown }} env Toy runtime environment.
 * @returns {{ mappings: Record<string, unknown>, skippedControls: string[] }} Normalized persisted state.
 */
function readStoredState(env) {
  const stored = getStoredValue(env);
  if (!isNonNullObject(stored)) {
    return { ...DEFAULT_STATE };
  }

  return {
    mappings: normalizeMappings(stored.mappings),
    skippedControls: normalizeSkippedControls(stored.skippedControls),
  };
}

/**
 * @param {{ get: (name: string) => unknown }} env Toy runtime environment.
 * @param {{ mappings: Record<string, unknown>, skippedControls: string[] }} nextState State to persist.
 * @returns {{ mappings: Record<string, unknown>, skippedControls: string[] }} Persisted or passthrough state.
 */
function persistState(env, nextState) {
  const setLocalPermanentData = env.get('setLocalPermanentData');
  if (typeof setLocalPermanentData !== 'function') {
    return nextState;
  }

  setLocalPermanentData({ [TOY_STORAGE_KEY]: nextState });
  return nextState;
}

/**
 * @param {string[]} items Existing skipped control keys.
 * @param {string | null | undefined} value Control key to append.
 * @returns {string[]} Updated skipped control keys.
 */
function uniquePush(items, value) {
  if (!value) {
    return items;
  }

  return [...new Set([...items, value])];
}

/**
 * @param {string[]} items Existing skipped control keys.
 * @param {string} value Control key to remove.
 * @returns {string[]} Updated skipped control keys.
 */
function withoutValue(items, value) {
  return items.filter(item => item !== value);
}

/**
 * @param {{ mappings: Record<string, unknown>, skippedControls: string[] }} storedState Current persisted state.
 * @param {Record<string, unknown>} parsed Parsed skip action payload.
 * @returns {{ mappings: Record<string, unknown>, skippedControls: string[] }} Updated state after skipping a control.
 */
function handleSkipAction(storedState, parsed) {
  return {
    ...storedState,
    skippedControls: uniquePush(
      storedState.skippedControls,
      /** @type {string | null | undefined} */ (parsed.skippedControlKey)
    ),
  };
}

/**
 * @param {{ mappings: Record<string, unknown>, skippedControls: string[] }} storedState Current persisted state.
 * @param {Record<string, unknown>} parsed Parsed capture action payload.
 * @returns {{ mappings: Record<string, unknown>, skippedControls: string[] }} Updated state after capturing a control.
 */
function handleCaptureAction(storedState, parsed) {
  const currentControlKey = /** @type {string} */ (parsed.currentControlKey);
  return {
    mappings: {
      ...storedState.mappings,
      [currentControlKey]: parsed.capture,
    },
    skippedControls: withoutValue(
      storedState.skippedControls,
      currentControlKey
    ),
  };
}

/**
 * @param {Record<string, unknown>} parsed Parsed Joy-Con mapper action.
 * @returns {boolean} Whether the parsed action is a valid capture payload.
 */
function isCaptureAction(parsed) {
  if (parsed.action !== 'capture') {
    return false;
  }

  return ['currentControlKey', 'capture'].every(key => Boolean(parsed[key]));
}

/**
 * @param {Record<string, unknown> | null} parsed Parsed Joy-Con mapper action.
 * @returns {parsed is Record<string, unknown>} Whether the parsed action is object-like.
 */
function isParsedAction(parsed) {
  return isNonNullObject(parsed);
}

/**
 * @param {{ mappings: Record<string, unknown>, skippedControls: string[] }} storedState Current persisted state.
 * @param {Record<string, unknown>} parsed Parsed Joy-Con mapper action.
 * @returns {{ mappings: Record<string, unknown>, skippedControls: string[] } | null} State update for non-capture actions.
 */
function getActionResult(storedState, parsed) {
  const actionHandlers = {
    reset: () => ({ ...DEFAULT_STATE }),
    skip: () => handleSkipAction(storedState, parsed),
  };
  const handler = actionHandlers[parsed.action];
  if (typeof handler !== 'function') {
    return null;
  }

  return handler();
}

/**
 * @param {{ mappings: Record<string, unknown>, skippedControls: string[] }} storedState Current persisted state.
 * @param {Record<string, unknown>} parsed Parsed Joy-Con mapper action.
 * @returns {{ mappings: Record<string, unknown>, skippedControls: string[] } | null} State update for any recognized action.
 */
function getResolvedActionState(storedState, parsed) {
  if (isCaptureAction(parsed)) {
    return handleCaptureAction(storedState, parsed);
  }

  return getActionResult(storedState, parsed);
}

/**
 * @param {Record<string, unknown> | null} parsed Parsed Joy-Con mapper action.
 * @param {{ mappings: Record<string, unknown>, skippedControls: string[] }} storedState Current persisted state.
 * @returns {{ mappings: Record<string, unknown>, skippedControls: string[] } | null} Resolved state candidate.
 */
function getNextState(parsed, storedState) {
  if (!isParsedAction(parsed)) {
    return null;
  }

  return getResolvedActionState(storedState, parsed);
}

/**
 * @param {Record<string, unknown> | null} parsed Parsed Joy-Con mapper action.
 * @param {{ mappings: Record<string, unknown>, skippedControls: string[] }} storedState Current persisted state.
 * @returns {{ mappings: Record<string, unknown>, skippedControls: string[] }} Next persisted state.
 */
function handleAction(parsed, storedState) {
  return getNextState(parsed, storedState) ?? storedState;
}

/**
 * @param {string} input Serialized Joy-Con mapper action payload.
 * @param {{ get: (name: string) => unknown }} env Toy runtime environment.
 * @returns {string} Serialized persisted Joy-Con mapping state.
 */
export function joyConMapperToy(input, env) {
  const parsed = parseInput(input);
  const storedState = readStoredState(env);
  const nextState = handleAction(parsed, storedState);
  const persistedState = persistState(env, nextState);

  return JSON.stringify({
    storageKey: TOY_STORAGE_KEY,
    mappings: persistedState.mappings,
    skippedControls: persistedState.skippedControls,
  });
}
