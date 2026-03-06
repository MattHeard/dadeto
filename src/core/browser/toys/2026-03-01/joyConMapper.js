const TOY_STORAGE_KEY = 'JOYMAP1';
const DEFAULT_STATE = {
  mappings: {},
  skippedControls: [],
};

/**
 * @param {unknown} value Candidate object-like value.
 * @returns {boolean} Whether the value is a non-null object.
 */
function isObjectValue(value) {
  return Boolean(value) && typeof value === 'object';
}

/**
 * @param {unknown} value Candidate serialized payload.
 * @returns {value is string} Whether the value is a non-empty string.
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

/**
 * @param {string} input Serialized Joy-Con mapper action payload.
 * @returns {Record<string, unknown> | null} Parsed JSON value or null on parse failure.
 */
function parseJsonInput(input) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

/**
 * @param {string} input Serialized Joy-Con mapper action payload.
 * @returns {Record<string, unknown> | null} Parsed action object or null for invalid input.
 */
function parseInput(input) {
  if (!isNonEmptyString(input)) {
    return null;
  }

  return parseJsonInput(input);
}

/**
 * @param {unknown} mappings Stored mapping payload from local permanent data.
 * @returns {Record<string, unknown>} Normalized mappings object.
 */
function normalizeMappings(mappings) {
  if (!isObjectValue(mappings)) {
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

  const stored = getLocalPermanentData()?.[TOY_STORAGE_KEY];
  if (!isObjectValue(stored)) {
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
 * @param {Record<string, unknown>} parsed Parsed Joy-Con mapper action.
 * @returns {boolean} Whether the parsed action is a valid capture payload.
 */
function isCaptureAction(parsed) {
  return (
    parsed.action === 'capture' &&
    Boolean(parsed.currentControlKey) &&
    Boolean(parsed.capture)
  );
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

  if (isCaptureAction(parsed)) {
    return handleCaptureAction(storedState, parsed);
  }

  const actionHandlers = {
    reset: () => ({ ...DEFAULT_STATE }),
    skip: () => handleSkipAction(storedState, parsed),
  };
  const handler = actionHandlers[parsed.action];
  if (typeof handler !== 'function') {
    return storedState;
  }

  return handler();
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
