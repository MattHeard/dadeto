const TOY_STORAGE_KEY = 'JOYMAP1';
const DEFAULT_STATE = {
  mappings: {},
  skippedControls: [],
};

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
    mappings: stored.mappings && typeof stored.mappings === 'object' ? stored.mappings : {},
    skippedControls: Array.isArray(stored.skippedControls) ? stored.skippedControls : [],
  };
}

function persistState(env, nextState) {
  const setLocalPermanentData = env.get('setLocalPermanentData');
  if (typeof setLocalPermanentData !== 'function') {
    return nextState;
  }

  setLocalPermanentData({ [TOY_STORAGE_KEY]: nextState });
  return nextState;
}

function uniquePush(items, value) {
  if (!value || items.includes(value)) {
    return items;
  }
  return [...items, value];
}

function withoutValue(items, value) {
  return items.filter(item => item !== value);
}

function handleAction(parsed, storedState) {
  if (!parsed || typeof parsed !== 'object') {
    return storedState;
  }

  if (parsed.action === 'reset') {
    return { ...DEFAULT_STATE };
  }

  if (parsed.action === 'skip') {
    return {
      ...storedState,
      skippedControls: uniquePush(storedState.skippedControls, parsed.skippedControlKey),
    };
  }

  if (parsed.action === 'capture' && parsed.currentControlKey && parsed.capture) {
    return {
      mappings: {
        ...storedState.mappings,
        [parsed.currentControlKey]: parsed.capture,
      },
      skippedControls: withoutValue(storedState.skippedControls, parsed.currentControlKey),
    };
  }

  return storedState;
}

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
