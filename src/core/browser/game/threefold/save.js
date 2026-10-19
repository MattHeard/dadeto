import { parseJsonOrNull } from '../../validation.js';
import { advanceCrisisClock, createCrisisClock } from './crisis.js';
import { createBrokenGateScene } from './gatehouse.js';
import { createThreefoldSimulation } from './simulation.js';
import { createScaleState } from './spatial.js';
import {
  advanceThreefoldEpisode,
  createThreefoldEpisodeState,
  normalizeThreefoldEpisodeState,
  THREEFOLD_GATE_REPAIR_GEOMETRY_IDS,
} from './episode.js';

const GAME_ID = 'threefold';
const SAVE_SCHEMA_VERSION = 1;
const SAVE_KEY = 'dadeto.threefold.scale-save.v1';
const SIMULATION_SCHEMA_VERSION = 1;
const SIMULATION_SAVE_KEY = 'dadeto.threefold.simulation-save.v1';

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
  return restoreSave(serialized, SAVE_SCHEMA_VERSION, normalizeScaleState);
}

/**
 * Bind the versioned codec to an injected storage implementation.
 * @param {{getItem: (key: string) => string|null, setItem: (key: string, value: string) => void, removeItem?: (key: string) => void}|null|undefined} storage Storage boundary supplied by the caller.
 * @returns {{load: () => ReturnType<typeof createScaleState>|null, save: (state: ReturnType<typeof createScaleState>) => boolean, clear: () => boolean}} Save operations that fail safely when storage is unavailable.
 */
export function createThreefoldScaleSaveStore(storage) {
  return createSaveStore(
    storage,
    SAVE_KEY,
    serializeThreefoldScaleSave,
    restoreThreefoldScaleSave
  );
}

/**
 * Serialize player progress and the deterministic active-crisis clock together.
 * The gatehouse itself is authored data and is reconstructed by scene ID.
 * @param {ReturnType<typeof createThreefoldSimulation>} simulation Current simulation.
 * @returns {string} Versioned complete-run save envelope.
 */
export function serializeThreefoldSimulation(simulation) {
  return JSON.stringify({
    game: GAME_ID,
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    sceneId: simulation.scene.id,
    state: {
      player: normalizeScaleState(simulation.player),
      crisis: normalizeCrisisClock(simulation.crisis),
      episode: normalizeThreefoldEpisodeState(simulation.episode),
    },
  });
}

/**
 * Restore a complete run against the current authored scene.
 * @param {unknown} serialized Complete-run save payload.
 * @returns {ReturnType<typeof createThreefoldSimulation>|null} Restored run or null when unsupported/corrupt.
 */
export function restoreThreefoldSimulation(serialized) {
  return restoreSave(
    serialized,
    SIMULATION_SCHEMA_VERSION,
    (state, envelope) => {
      if (envelope.sceneId !== 'broken-gate')
        throw new RangeError('Unknown scene.');
      const scene = createBrokenGateScene();
      const crisis = normalizeCrisisClock(state.crisis);
      const episode = normalizeThreefoldEpisodeState(
        state.episode ?? createThreefoldEpisodeState()
      );
      const player = normalizeScaleState(state.player);
      if (episode.withdrawn === true && crisis.stage !== 'aftermath')
        throw new RangeError('A withdrawn episode must be settled.');
      if (episode.gateRepaired === true) {
        if (crisis.stage !== 'surge' && crisis.stage !== 'aftermath')
          throw new RangeError('A repaired gate must follow the surge.');
        if (
          THREEFOLD_GATE_REPAIR_GEOMETRY_IDS.some(id =>
            player.destroyedGeometryIds.includes(id)
          )
        )
          throw new RangeError('A repaired gate cannot remain damaged.');
      }
      return {
        scene,
        player,
        crisis,
        episode: advanceThreefoldEpisode(episode, crisis),
      };
    }
  );
}

/**
 * Bind the complete-run codec to an injected storage implementation.
 * @param {{getItem: (key: string) => string|null, setItem: (key: string, value: string) => void, removeItem?: (key: string) => void}|null|undefined} storage Storage boundary supplied by the caller.
 * @returns {{load: () => ReturnType<typeof createThreefoldSimulation>|null, save: (state: ReturnType<typeof createThreefoldSimulation>) => boolean, clear: () => boolean}} Complete-run save operations.
 */
export function createThreefoldSimulationSaveStore(storage) {
  return createSaveStore(
    storage,
    SIMULATION_SAVE_KEY,
    serializeThreefoldSimulation,
    restoreThreefoldSimulation
  );
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
 * Bind a codec to its injected storage implementation.
 * @template T
 * @param {{getItem: (key: string) => string|null, setItem: (key: string, value: string) => void, removeItem?: (key: string) => void}|null|undefined} storage Injected storage boundary.
 * @param {string} key Namespaced save key.
 * @param {(state: T) => string} serialize Save encoder.
 * @param {(serialized: unknown) => T|null} restore Save decoder.
 * @returns {{load: () => T|null, save: (state: T) => boolean, clear: () => boolean}} Storage operations.
 */
function createSaveStore(storage, key, serialize, restore) {
  return {
    load: () => {
      try {
        return restore(storage?.getItem(key));
      } catch {
        return null;
      }
    },
    save: state =>
      runStorageMutation(storage, 'setItem', key, serialize(state)),
    clear: () => runStorageMutation(storage, 'removeItem', key),
  };
}

/**
 * Decode a versioned envelope and normalize its payload.
 * @template T
 * @param {unknown} serialized Candidate serialized save.
 * @param {number} schemaVersion Supported schema version.
 * @param {(state: any, envelope: Record<string, any>) => T} normalize Payload validator and normalizer.
 * @returns {T|null} Normalized payload, or null when invalid.
 */
function restoreSave(serialized, schemaVersion, normalize) {
  if (typeof serialized !== 'string') return null;
  const parsed = parseJsonOrNull(serialized);
  if (!parsed || typeof parsed !== 'object') return null;
  const envelope = /** @type {Record<string, any>} */ (parsed);
  if (envelope.game !== GAME_ID || envelope.schemaVersion !== schemaVersion)
    return null;
  try {
    return normalize(envelope.state ?? envelope, envelope);
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

/**
 * Rebuild a crisis clock from its authored thresholds and elapsed game time.
 * @param {ReturnType<typeof createCrisisClock>} state Candidate clock state.
 * @returns {ReturnType<typeof createCrisisClock>} Canonical crisis clock.
 */
function normalizeCrisisClock(state) {
  const initial = createCrisisClock(state.thresholds);
  const restored =
    state.elapsedMinutes === 0
      ? initial
      : advanceCrisisClock(initial, {
          type: 'wait',
          elapsedGameMinutes: state.elapsedMinutes,
        });
  if (
    restored.elapsedMinutes !== state.elapsedMinutes ||
    restored.stage !== state.stage
  )
    throw new RangeError('Crisis clock state is inconsistent.');
  return restored;
}
