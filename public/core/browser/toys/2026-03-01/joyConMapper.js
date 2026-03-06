const TOY_STORAGE_KEY = 'JOYMAP1';
const DEFAULT_STATE = {
  mappings: {},
  skippedControls: [],
};

/**
 * @param {string} input Serialized Joy-Con mapper action payload.
 * @returns {Record<string, unknown> | null} Parsed action object or null for invalid input.
 */
function parseInput(input) {
  if (typeof input !== 'string' || input.length === 0) {
    return null;
  }

  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

/**
 * @param {unknown} mappings Stored mapping payload from local permanent data.
 * @returns {Record<string, unknown>} Normalized mappings object.
 */
function normalizeMappings(mappings) {
  if (!mappings || typeof mappings !== 'object') {
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
 * @returns {{ mappings: Record<string, unknown>, skippedControls: string[] }} Normalized persisted state.
 */
function readStoredState(env) {
  const getLocalPermanentData = env.get('getLocalPermanentData');
  if (typeof getLocalPermanentData !== 'function') {
    return { ...DEFAULT_STATE };
  }

  const root = getLocalPermanentData() ?? {};
  const stored = root?.[TOY_STORAGE_KEY];
  if (!stored || typeof stored !== 'object') {
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
  if (!value || items.includes(value)) {
    return items;
  }
  return [...items, value];
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
 * @param {Record<string, unknown> | null} parsed Parsed Joy-Con mapper action.
 * @param {{ mappings: Record<string, unknown>, skippedControls: string[] }} storedState Current persisted state.
 * @returns {{ mappings: Record<string, unknown>, skippedControls: string[] }} Next persisted state.
 */
function handleAction(parsed, storedState) {
  if (!parsed || typeof parsed !== 'object') {
    return storedState;
  }

  if (parsed.action === 'reset') {
    return { ...DEFAULT_STATE };
  }

  if (parsed.action === 'skip') {
    return handleSkipAction(storedState, parsed);
  }

  if (parsed.action === 'capture' && parsed.currentControlKey && parsed.capture) {
    return handleCaptureAction(storedState, parsed);
  }

  return storedState;
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
