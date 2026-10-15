import { parseJsonOrNull } from '../../validation.js';
import { createScaleState } from './spatial.js';

const GAME_ID = 'threefold';
const SAVE_SCHEMA_VERSION = 1;

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
