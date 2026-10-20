import { parseJsonOrNull } from '../../validation.js';
import { advanceCrisisClock, createCrisisClock } from './crisis.js';
import { createBrokenGateScene } from './gatehouse.js';
import { createThreefoldSimulation } from './simulation.js';
import { createScaleState } from './spatial.js';
import {
  createThreefoldEncounter,
  migrateLegacyThreefoldEncounter,
  normalizeThreefoldEncounter,
} from './encounter.js';
import {
  advanceThreefoldEpisode,
  createThreefoldEpisodeState,
  normalizeThreefoldEpisodeState,
  THREEFOLD_SIGNAL_STATION_GEOMETRY_ID,
  THREEFOLD_GATE_REPAIR_GEOMETRY_IDS,
} from './episode.js';

const GAME_ID = 'threefold';
const SAVE_SCHEMA_VERSION = 1;
const SAVE_KEY = 'dadeto.threefold.scale-save.v1';
const LEGACY_SIMULATION_SCHEMA_VERSION = 1;
const PREVIOUS_SIMULATION_SCHEMA_VERSION = 2;
const SIMULATION_SCHEMA_VERSION = 3;
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
      encounter: normalizeThreefoldEncounter(simulation.encounter),
    },
  });
}

/**
 * Restore a complete run against the current authored scene.
 * @param {unknown} serialized Complete-run save payload.
 * @returns {ReturnType<typeof createThreefoldSimulation>|null} Restored run or null when unsupported/corrupt.
 */
export function restoreThreefoldSimulation(serialized) {
  const envelope = readSimulationEnvelope(serialized);
  if (!envelope) return null;
  try {
    if (envelope.sceneId !== 'broken-gate')
      throw new RangeError('Unknown scene.');
    const legacyV1 =
      envelope.schemaVersion === LEGACY_SIMULATION_SCHEMA_VERSION;
    const legacyV2 =
      envelope.schemaVersion === PREVIOUS_SIMULATION_SCHEMA_VERSION;
    const state = envelope.state ?? envelope;
    if (!legacyV1 && !Object.hasOwn(state, 'encounter'))
      throw new RangeError('THREEFOLD encounter state is missing.');
    const scene = createBrokenGateScene();
    const crisis = normalizeCrisisClock(state.crisis);
    const episode = normalizeThreefoldEpisodeState(
      state.episode ?? createThreefoldEpisodeState()
    );
    const player = normalizeScaleState(state.player);
    if (episode.withdrawn === true && crisis.stage !== 'aftermath')
      throw new RangeError('A withdrawn episode must be settled.');
    if (episode.closedBy !== undefined && crisis.stage !== 'aftermath')
      throw new RangeError('A closed episode must follow the aftermath.');
    if (
      episode.closedBy === 'reported' &&
      player.destroyedGeometryIds.includes(THREEFOLD_SIGNAL_STATION_GEOMETRY_ID)
    )
      throw new RangeError('A destroyed signal station cannot file a report.');
    if (episode.gateRepaired === true) {
      if (
        episode.gateRepairedBeforeSurge !== true &&
        crisis.stage !== 'surge' &&
        crisis.stage !== 'aftermath'
      )
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
      encounter: legacyV1
        ? createThreefoldEncounter()
        : legacyV2
          ? migrateLegacyThreefoldEncounter(state.encounter)
          : normalizeThreefoldEncounter(state.encounter),
    };
  } catch {
    return null;
  }
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
 * Read an envelope supported by the complete-run codec.
 * @param {unknown} serialized Candidate complete-run export.
 * @returns {Record<string, any>|null} Supported game envelope.
 */
function readSimulationEnvelope(serialized) {
  const envelope = readSaveEnvelope(serialized);
  return envelope &&
    envelope.game === GAME_ID &&
    [
      LEGACY_SIMULATION_SCHEMA_VERSION,
      PREVIOUS_SIMULATION_SCHEMA_VERSION,
      SIMULATION_SCHEMA_VERSION,
    ].includes(envelope.schemaVersion)
    ? envelope
    : null;
}

/**
 * Parse an envelope shared by both THREEFOLD save codecs.
 * @param {unknown} serialized Candidate serialized save.
 * @returns {Record<string, any>|null} Parsed object envelope.
 */
function readSaveEnvelope(serialized) {
  if (typeof serialized !== 'string') return null;
  const parsed = parseJsonOrNull(serialized);
  if (!parsed || typeof parsed !== 'object') return null;
  return /** @type {Record<string, any>} */ (parsed);
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
