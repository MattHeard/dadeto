import { parseJsonOrNull } from '../../validation.js';
import { createScaleState } from './spatial.js';

const GAME_ID = 'threefold';
const SAVE_SCHEMA_VERSION = 1;
const SAVE_KEY = 'dadeto.threefold.scale-save.v1';

/**
 * Serialize scale progress and irreversible geometry damage for export.
 * @param {ReturnType<typeof createScaleState>} state Current scale state.
 * @returns {string} Versioned JSON save envelope.
 */
export function serializeThreefoldScaleSave(state) {
  return JSON.stringify({
    game: GAME_ID,
    schemaVersion: SAVE_SCHEMA_VERSION,
    state: normalizeScaleState(state),
  });
}

/**
 * Restore supported scale progress, or reject malformed and unknown exports.
 * @param {unknown} serialized Exported save payload.
 * @returns {ReturnType<typeof createScaleState>|null} Valid scale state or null.
 */
export function restoreThreefoldScaleSave(serialized) {
  if (typeof serialized !== 'string') return null;
  const parsed = parseJsonOrNull(serialized);
  if (!parsed || typeof parsed !== 'object') return null;
  const envelope = /** @type {Record<string, any>} */ (parsed);
  if (
    envelope.game !== GAME_ID ||
    envelope.schemaVersion !== SAVE_SCHEMA_VERSION
  )
    return null;
  try {
    return normalizeScaleState(envelope.state);
  } catch {
    return null;
  }
}

/**
 * Bind the versioned codec to an injected storage implementation.
 * @param {{getItem: (key: string) => string|null, setItem: (key: string, value: string) => void, removeItem?: (key: string) => void}|null|undefined} storage Storage boundary supplied by the caller.
 * @returns {{load: () => ReturnType<typeof createScaleState>|null, save: (state: ReturnType<typeof createScaleState>) => boolean, clear: () => boolean}} Save operations that fail safely when storage is unavailable.
 */
export function createThreefoldScaleSaveStore(storage) {
  return {
    load: () => {
      try {
        return restoreThreefoldScaleSave(storage?.getItem(SAVE_KEY));
      } catch {
        return null;
      }
    },
    save: state =>
      runStorageMutation(
        storage,
        'setItem',
        SAVE_KEY,
        serializeThreefoldScaleSave(state)
      ),
    clear: () => runStorageMutation(storage, 'removeItem', SAVE_KEY),
  };
}

/**
 * @param {{[key: string]: any}|null|undefined} storage Injected storage boundary.
 * @param {'setItem'|'removeItem'} method Storage operation name.
 * @param {string} key Namespaced save key.
 * @param {string} [value] Serialized save for setItem.
 * @returns {boolean} Whether storage accepted the mutation.
 */
function runStorageMutation(storage, method, key, value) {
  const operation = storage?.[method];
  if (
    typeof operation !== 'function' ||
    (method === 'setItem' && value === undefined)
  ) {
    return false;
  }
  try {
    operation.call(storage, key, value);
  } catch {
    return false;
  }
  return true;
}

/**
 * Rebuild a canonical state through the domain constructor and its invariants.
 * @param {ReturnType<typeof createScaleState>} state Candidate state.
 * @returns {ReturnType<typeof createScaleState>} Canonical scale state.
 */
function normalizeScaleState(state) {
  return createScaleState(state.position, {
    scale: state.scale,
    anchor: state.anchor,
    maximumAnchor: state.maximumAnchor,
    minimumUnlockedScale: state.minimumUnlockedScale,
    maximumUnlockedScale: state.maximumUnlockedScale,
    recoveryProgressMinutes: state.recoveryProgressMinutes,
    destroyedGeometryIds: state.destroyedGeometryIds,
  });
}
