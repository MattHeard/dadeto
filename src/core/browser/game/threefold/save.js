import {
  restoreThreefoldPressureNetwork,
  serializeThreefoldPressureNetwork,
} from './pressure-network.js';
import { parseJsonOrNull } from '../../validation.js';
import { advanceCrisisClock, createCrisisClock } from './crisis.js';
import { createBrokenGateScene } from './gatehouse.js';
import { isThreefoldHighWorldSceneId } from './high-world-scenes.js';
import { createThreefoldBelltopsScene } from './belltops.js';
import {
  createThreefoldCrownbackReachScene,
  normalizeThreefoldCrownbackReachState,
  THREEFOLD_CROWNBACK_REACH_SCENE_ID,
} from './crownback-reach.js';
import {
  createThreefoldWakeformShoalsScene,
  normalizeThreefoldWakeformShoalsState,
  THREEFOLD_WAKEFORM_SHOALS_SCENE_ID,
} from './wakeform-shoals.js';
import {
  createThreefoldHearthgapsScene,
  normalizeThreefoldHearthgapsState,
  THREEFOLD_HEARTHGAPS_SCENE_ID,
} from './hearthgaps.js';
import {
  createThreefoldWeftwaysScene,
  normalizeThreefoldWeftwaysState,
  THREEFOLD_WEFTWAYS_SCENE_ID,
} from './weftways.js';
import {
  createThreefoldGrainlandsScene,
  normalizeThreefoldGrainlandsState,
  THREEFOLD_GRAINLANDS_SCENE_ID,
} from './grainlands.js';
import { createThreefoldLanternWardScene } from './lantern-ward.js';
import {
  createThreefoldSluiceScene,
  THREEFOLD_SLUICE_SCENE_ID,
} from './sluice-scene.js';
import {
  createThreefoldSiltMarginScene,
  normalizeThreefoldSiltMarginState,
  THREEFOLD_SILT_MARGIN_GUARDIAN_ID,
  THREEFOLD_SILT_MARGIN_SCENE_ID,
} from './silt-margin.js';
import {
  createThreefoldSimulation,
  isHearthgapsSimulationState,
  isHighWorldSimulationState,
  isSiltMarginSimulationState,
  isSluiceSimulationState,
  isWeftwaysSimulationState,
  isThreefoldGrainlandsSimulationState,
} from './simulation.js';
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
import { normalizeThreefoldSluicePuzzle } from './water-puzzle.js';
import {
  normalizeThreefoldElapsedGameSeconds,
  restoreThreefoldCampaignClock,
  serializeThreefoldCampaignClock,
} from './campaign-clock.js';
import {
  restoreThreefoldCampaignOutcomes,
  serializeThreefoldCampaignOutcomes,
} from './campaign-outcomes.js';

const GAME_ID = 'threefold';
const SAVE_SCHEMA_VERSION = 1;
const SAVE_KEY = 'dadeto.threefold.scale-save.v1';
const LEGACY_SIMULATION_SCHEMA_VERSION = 1;
const PREVIOUS_SIMULATION_SCHEMA_VERSION = 2;
const SIMULATION_SCHEMA_VERSION = 6;
const LEGACY_SLUICE_SIMULATION_SCHEMA_VERSION = 4;
const SLUICE_SIMULATION_SCHEMA_VERSION = 5;
const LEGACY_SILT_MARGIN_SIMULATION_SCHEMA_VERSION = 1;
const SILT_MARGIN_SIMULATION_SCHEMA_VERSION = 2;
const HEARTHGAPS_SIMULATION_SCHEMA_VERSION = 1;
const LEGACY_WEFTWAYS_SIMULATION_SCHEMA_VERSION = 1;
const PREVIOUS_WEFTWAYS_SIMULATION_SCHEMA_VERSION = 2;
const THIRD_WEFTWAYS_SIMULATION_SCHEMA_VERSION = 3;
const WEFTWAYS_SIMULATION_SCHEMA_VERSION = 4;
const GRAINLANDS_SIMULATION_SCHEMA_VERSION = 1;
const SIMULATION_SAVE_KEY = 'dadeto.threefold.simulation-save.v1';
const SLUICE_SIMULATION_SAVE_KEY =
  'dadeto.threefold.simulation-save.v1.small-world-sluice';
const SILT_MARGIN_SIMULATION_SAVE_KEY =
  'dadeto.threefold.simulation-save.v1.silt-margin';
const HEARTHGAPS_SIMULATION_SAVE_KEY =
  'dadeto.threefold.simulation-save.v1.hearthgaps';
const WEFTWAYS_SIMULATION_SAVE_KEY =
  'dadeto.threefold.simulation-save.v1.weftways';
const GRAINLANDS_SIMULATION_SAVE_KEY =
  'dadeto.threefold.simulation-save.v1.grainlands';
const CAMPAIGN_CLOCK_SAVE_KEY = 'dadeto.threefold.campaign-clock.v1';
const CAMPAIGN_OUTCOMES_SAVE_KEY = 'dadeto.threefold.campaign-outcomes.v1';

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
 * Bind the campaign-wide deterministic clock to its own storage entry.
 * @param {{getItem: (key: string) => string|null, setItem: (key: string, value: string) => void, removeItem?: (key: string) => void}|null|undefined} storage Storage boundary supplied by the caller.
 * @returns {{load: () => {elapsedGameSeconds: number}|null, save: (state: {elapsedGameSeconds: number}) => boolean, clear: () => boolean}} Campaign clock save operations.
 */
export function createThreefoldCampaignClockSaveStore(storage) {
  return createSaveStore(
    storage,
    CAMPAIGN_CLOCK_SAVE_KEY,
    serializeThreefoldCampaignClock,
    restoreThreefoldCampaignClock
  );
}

/**
 * Bind explicit campaign outcomes to storage outside all route saves.
 * @param {{getItem: (key: string) => string|null, setItem: (key: string, value: string) => void, removeItem?: (key: string) => void}|null|undefined} storage Storage boundary supplied by the caller.
 * @returns {{load: () => {iriFate: import('./campaign-outcomes.js').ThreefoldIriFate|null}|null, save: (state: {iriFate: import('./campaign-outcomes.js').ThreefoldIriFate|null}) => boolean, clear: () => boolean}} Campaign outcome save operations.
 */
export function createThreefoldCampaignOutcomesSaveStore(storage) {
  return createSaveStore(
    storage,
    CAMPAIGN_OUTCOMES_SAVE_KEY,
    serializeThreefoldCampaignOutcomes,
    restoreThreefoldCampaignOutcomes
  );
}

/**
 * Bind the shared physical pressure network outside every region save.
 * @param {Parameters<typeof createThreefoldCampaignClockSaveStore>[0]} storage Injected storage boundary.
 * @returns {{load: () => import('./pressure-network.js').ThreefoldPressureNetwork|null, save: (state: import('./pressure-network.js').ThreefoldPressureNetwork) => boolean, clear: () => boolean}} Campaign pressure operations.
 */
export function createThreefoldPressureNetworkSaveStore(storage) {
  return createSaveStore(
    storage,
    'dadeto.threefold.pressure-network.v1',
    serializeThreefoldPressureNetwork,
    restoreThreefoldPressureNetwork
  );
}

/**
 * Serialize player progress and the deterministic active-crisis clock together.
 * The gatehouse itself is authored data and is reconstructed by scene ID.
 * @param {ReturnType<typeof createThreefoldSimulation>} simulation Current simulation.
 * @returns {string} Versioned complete-run save envelope.
 */
export function serializeThreefoldSimulation(simulation) {
  const state = /** @type {Record<string, any>} */ ({
    player: normalizeScaleState(simulation.player),
    crisis: normalizeCrisisClock(simulation.crisis),
    episode: normalizeThreefoldEpisodeState(simulation.episode, {
      includeTestimony:
        !isSluiceSimulationState(simulation) &&
        !isSiltMarginSimulationState(simulation) &&
        !isHearthgapsSimulationState(simulation) &&
        !isWeftwaysSimulationState(simulation) &&
        !isThreefoldGrainlandsSimulationState(simulation) &&
        !isHighWorldSimulationState(simulation),
    }),
    encounter: normalizeThreefoldEncounter(simulation.encounter),
  });
  if (isSluiceSimulationState(simulation)) {
    state.sluicePuzzle = normalizeThreefoldSluicePuzzle(
      simulation.sluicePuzzle
    );
    state.archiveTraceHeard = normalizeArchiveTraceHeard(
      simulation.archiveTraceHeard
    );
  }
  if (isSiltMarginSimulationState(simulation)) {
    state.siltMargin = normalizeThreefoldSiltMarginState(simulation.siltMargin);
  }
  if (isHearthgapsSimulationState(simulation))
    state.hearthgaps = normalizeThreefoldHearthgapsState(simulation.hearthgaps);
  if (isWeftwaysSimulationState(simulation))
    state.weftways = normalizeThreefoldWeftwaysState(simulation.weftways);
  if (isThreefoldGrainlandsSimulationState(simulation))
    state.grainlands = normalizeThreefoldGrainlandsState(simulation.grainlands);
  if (simulation.scene.id === THREEFOLD_CROWNBACK_REACH_SCENE_ID)
    state.crownbackReach = normalizeThreefoldCrownbackReachState(
      /** @type {Record<string, any>} */ (simulation).crownbackReach
    );
  if (simulation.scene.id === THREEFOLD_WAKEFORM_SHOALS_SCENE_ID)
    state.wakeformShoals = normalizeThreefoldWakeformShoalsState(
      /** @type {Record<string, any>} */ (simulation).wakeformShoals
    );
  const elapsedGameSeconds = getSimulationElapsedGameSeconds(simulation);
  if (elapsedGameSeconds !== null)
    state.elapsedGameSeconds = normalizeThreefoldElapsedGameSeconds(
      elapsedGameSeconds,
      'Small-world'
    );
  return JSON.stringify({
    game: GAME_ID,
    schemaVersion: isSluiceSimulationState(simulation)
      ? SLUICE_SIMULATION_SCHEMA_VERSION
      : isSiltMarginSimulationState(simulation)
        ? SILT_MARGIN_SIMULATION_SCHEMA_VERSION
        : isHearthgapsSimulationState(simulation)
          ? HEARTHGAPS_SIMULATION_SCHEMA_VERSION
          : isWeftwaysSimulationState(simulation)
            ? WEFTWAYS_SIMULATION_SCHEMA_VERSION
            : isThreefoldGrainlandsSimulationState(simulation)
              ? GRAINLANDS_SIMULATION_SCHEMA_VERSION
              : SIMULATION_SCHEMA_VERSION,
    sceneId: simulation.scene.id,
    state,
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
    const sceneKinds = {
      sluice: envelope.sceneId === THREEFOLD_SLUICE_SCENE_ID,
      siltMargin: envelope.sceneId === THREEFOLD_SILT_MARGIN_SCENE_ID,
      hearthgaps: envelope.sceneId === THREEFOLD_HEARTHGAPS_SCENE_ID,
      weftways: envelope.sceneId === THREEFOLD_WEFTWAYS_SCENE_ID,
      grainlands: envelope.sceneId === THREEFOLD_GRAINLANDS_SCENE_ID,
      highWorld: isThreefoldHighWorldSceneId(envelope.sceneId),
    };
    const isTimedScene =
      sceneKinds.sluice ||
      sceneKinds.siltMargin ||
      sceneKinds.hearthgaps ||
      sceneKinds.weftways ||
      sceneKinds.grainlands ||
      sceneKinds.highWorld;
    if (!isTimedScene && envelope.sceneId !== 'broken-gate')
      throw new RangeError('Unknown scene.');
    if (
      sceneKinds.sluice &&
      ![
        LEGACY_SLUICE_SIMULATION_SCHEMA_VERSION,
        SLUICE_SIMULATION_SCHEMA_VERSION,
      ].includes(envelope.schemaVersion)
    )
      throw new RangeError('Sluice save version is unsupported.');
    if (
      sceneKinds.siltMargin &&
      ![
        LEGACY_SILT_MARGIN_SIMULATION_SCHEMA_VERSION,
        SILT_MARGIN_SIMULATION_SCHEMA_VERSION,
      ].includes(envelope.schemaVersion)
    )
      throw new RangeError('Silt Margin save version is unsupported.');
    if (
      sceneKinds.highWorld &&
      envelope.schemaVersion !== SIMULATION_SCHEMA_VERSION
    )
      throw new RangeError('High-world save version is unsupported.');
    if (
      sceneKinds.hearthgaps &&
      envelope.schemaVersion !== HEARTHGAPS_SIMULATION_SCHEMA_VERSION
    )
      throw new RangeError('Hearthgaps save version is unsupported.');
    if (
      sceneKinds.weftways &&
      ![
        LEGACY_WEFTWAYS_SIMULATION_SCHEMA_VERSION,
        PREVIOUS_WEFTWAYS_SIMULATION_SCHEMA_VERSION,
        THIRD_WEFTWAYS_SIMULATION_SCHEMA_VERSION,
        WEFTWAYS_SIMULATION_SCHEMA_VERSION,
      ].includes(envelope.schemaVersion)
    )
      throw new RangeError('Weftways save version is unsupported.');
    if (
      sceneKinds.grainlands &&
      envelope.schemaVersion !== GRAINLANDS_SIMULATION_SCHEMA_VERSION
    )
      throw new RangeError('Grainlands save version is unsupported.');
    const usesBrokenGateSchema =
      !sceneKinds.siltMargin &&
      !sceneKinds.hearthgaps &&
      !sceneKinds.weftways &&
      !sceneKinds.grainlands &&
      !sceneKinds.highWorld;
    const legacyV1 =
      usesBrokenGateSchema &&
      envelope.schemaVersion === LEGACY_SIMULATION_SCHEMA_VERSION;
    const legacyV2 =
      usesBrokenGateSchema &&
      envelope.schemaVersion === PREVIOUS_SIMULATION_SCHEMA_VERSION;
    const state = envelope.state ?? envelope;
    if (!legacyV1 && !Object.hasOwn(state, 'encounter'))
      throw new RangeError('THREEFOLD encounter state is missing.');
    const crisis = normalizeCrisisClock(state.crisis);
    const includeTestimony = !isTimedScene;
    const episode = normalizeThreefoldEpisodeState(
      state.episode ?? createThreefoldEpisodeState({ includeTestimony }),
      { includeTestimony }
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
    const restoredState = {
      player,
      crisis,
      episode: advanceThreefoldEpisode(episode, crisis),
      encounter: legacyV1
        ? createThreefoldEncounter()
        : legacyV2
          ? migrateLegacyThreefoldEncounter(state.encounter)
          : normalizeThreefoldEncounter(state.encounter),
    };
    if (!isTimedScene)
      return {
        ...restoredState,
        scene: createBrokenGateScene(),
      };
    if (sceneKinds.highWorld) {
      if (envelope.sceneId === THREEFOLD_WAKEFORM_SHOALS_SCENE_ID) {
        const wakeformShoals = normalizeThreefoldWakeformShoalsState(
          state.wakeformShoals
        );
        return restoreTimedScene(
          restoredState,
          state,
          createThreefoldWakeformShoalsScene({
            wakeformDiverted: wakeformShoals.wakeformDiverted,
          }),
          { wakeformShoals }
        );
      }
      const highWorldScene =
        envelope.sceneId === 'belltops'
          ? createThreefoldBelltopsScene()
          : envelope.sceneId === THREEFOLD_CROWNBACK_REACH_SCENE_ID
            ? createThreefoldCrownbackReachScene()
            : createThreefoldLanternWardScene();
      if (envelope.sceneId === THREEFOLD_CROWNBACK_REACH_SCENE_ID)
        return restoreTimedScene(restoredState, state, highWorldScene, {
          crownbackReach: normalizeThreefoldCrownbackReachState(
            state.crownbackReach
          ),
        });
      return restoreTimedScene(restoredState, state, highWorldScene);
    }
    if (sceneKinds.siltMargin)
      return restoreTimedScene(
        restoredState,
        state,
        createThreefoldSiltMarginScene(),
        {
          siltMargin: normalizeSiltMarginEncounter(
            state.siltMargin,
            restoredState.encounter
          ),
        }
      );
    if (sceneKinds.hearthgaps)
      return restoreTimedScene(
        restoredState,
        state,
        createThreefoldHearthgapsScene(),
        { hearthgaps: normalizeThreefoldHearthgapsState(state.hearthgaps) }
      );
    if (sceneKinds.weftways)
      return restoreTimedScene(
        restoredState,
        state,
        createThreefoldWeftwaysScene(),
        {
          weftways: normalizeThreefoldWeftwaysState(
            migrateWeftwaysRelayResponse(state.weftways, envelope.schemaVersion)
          ),
        }
      );
    if (sceneKinds.grainlands)
      return restoreTimedScene(
        restoredState,
        state,
        createThreefoldGrainlandsScene(),
        { grainlands: normalizeThreefoldGrainlandsState(state.grainlands) }
      );
    return restoreTimedScene(
      restoredState,
      state,
      createThreefoldSluiceScene(),
      {
        sluicePuzzle: normalizeThreefoldSluicePuzzle(state.sluicePuzzle),
        archiveTraceHeard:
          envelope.schemaVersion === LEGACY_SLUICE_SIMULATION_SCHEMA_VERSION
            ? false
            : normalizeArchiveTraceHeard(state.archiveTraceHeard),
      }
    );
  } catch {
    return null;
  }
}

/**
 * Restore the guardian branch only when its permanent death record agrees.
 * @param {unknown} candidate Saved Silt Margin branch.
 * @param {import('./encounter.js').ThreefoldEncounter} encounter Canonical encounter record.
 * @returns {ReturnType<typeof normalizeThreefoldSiltMarginState>} Consistent route outcome.
 */
function normalizeSiltMarginEncounter(candidate, encounter) {
  const branch = normalizeThreefoldSiltMarginState(candidate);
  const guardianDied = (encounter.growthDeaths || []).some(
    death => death.creatureId === THREEFOLD_SILT_MARGIN_GUARDIAN_ID
  );
  if (guardianDied !== (branch.guardian === 'killed'))
    throw new RangeError(
      'Silt Margin guardian fate disagrees with its death record.'
    );
  return branch;
}

/**
 * Validate the optional Tidal Archive discovery added in schema v5.
 * @param {unknown} heard Saved discovery flag.
 * @returns {boolean} Canonical discovery state.
 */
function normalizeArchiveTraceHeard(heard) {
  if (typeof heard !== 'boolean')
    throw new TypeError('Tidal Archive trace state is invalid.');
  return heard;
}

/**
 * Add response fields introduced after the original Weftways route save.
 * @param {Record<string, any>} state Saved Weftways route state.
 * @param {number} schemaVersion Version of the saved route.
 * @returns {Record<string, any>} State with version-specific response defaults.
 */
function migrateWeftwaysRelayResponse(state, schemaVersion) {
  return {
    ...state,
    ...(schemaVersion === LEGACY_WEFTWAYS_SIMULATION_SCHEMA_VERSION
      ? { relayRecordConcealed: false }
      : {}),
    ...(schemaVersion < THIRD_WEFTWAYS_SIMULATION_SCHEMA_VERSION
      ? { relayRecordDestroyed: false }
      : {}),
    ...(schemaVersion < WEFTWAYS_SIMULATION_SCHEMA_VERSION
      ? { relayRestitutionNegotiated: false }
      : {}),
  };
}

/**
 * Rebuild one independently timed scene after validating its saved state.
 * @param {Record<string, any>} restoredState Shared player, episode, and encounter state.
 * @param {Record<string, any>} state Serialized scene state.
 * @param {ReturnType<typeof createThreefoldSluiceScene>|ReturnType<typeof createThreefoldSiltMarginScene>|ReturnType<typeof createThreefoldHearthgapsScene>|ReturnType<typeof createThreefoldWeftwaysScene>|ReturnType<typeof createThreefoldGrainlandsScene>|ReturnType<typeof createThreefoldBelltopsScene>|ReturnType<typeof createThreefoldLanternWardScene>|ReturnType<typeof createThreefoldCrownbackReachScene>|ReturnType<typeof createThreefoldWakeformShoalsScene>} scene Authored scene reconstruction.
 * @param {Record<string, any>} [sceneState] Validated scene-specific puzzle state.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Complete restored scene.
 */
function restoreTimedScene(restoredState, state, scene, sceneState = {}) {
  return /** @type {ReturnType<typeof createThreefoldSimulation>} */ ({
    ...restoredState,
    ...sceneState,
    scene,
    elapsedGameSeconds: normalizeThreefoldElapsedGameSeconds(
      state.elapsedGameSeconds,
      'Small-world'
    ),
  });
}

/**
 * Bind the complete-run codec to an injected storage implementation.
 * @param {{getItem: (key: string) => string|null, setItem: (key: string, value: string) => void, removeItem?: (key: string) => void}|null|undefined} storage Storage boundary supplied by the caller.
 * @param {string} [sceneId] Authored scene whose save key is isolated.
 * @returns {{load: () => ReturnType<typeof createThreefoldSimulation>|null, save: (state: ReturnType<typeof createThreefoldSimulation>) => boolean, clear: () => boolean}} Complete-run save operations.
 */
export function createThreefoldSimulationSaveStore(
  storage,
  sceneId = 'broken-gate'
) {
  return createSaveStore(
    storage,
    getThreefoldSimulationSaveKey(sceneId),
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
    [1, 2, 3, 4, 5, SIMULATION_SCHEMA_VERSION].includes(envelope.schemaVersion)
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

/**
 * Read elapsed time only from scenes that use an independent game clock.
 * @param {ReturnType<typeof createThreefoldSimulation>} simulation Current scene state.
 * @returns {number|null} Elapsed game seconds, or null for the crisis clock.
 */
function getSimulationElapsedGameSeconds(simulation) {
  if (isSluiceSimulationState(simulation)) return simulation.elapsedGameSeconds;
  if (isSiltMarginSimulationState(simulation))
    return simulation.elapsedGameSeconds;
  if (isHearthgapsSimulationState(simulation))
    return simulation.elapsedGameSeconds;
  if (isWeftwaysSimulationState(simulation))
    return simulation.elapsedGameSeconds;
  if (isThreefoldGrainlandsSimulationState(simulation))
    return simulation.elapsedGameSeconds;
  if (isHighWorldSimulationState(simulation))
    return simulation.elapsedGameSeconds;
  return null;
}

/**
 * Keep every authored route's complete-run save in its own storage entry.
 * @param {string} sceneId Authored scene identifier.
 * @returns {string} Storage key for the selected route.
 */
function getThreefoldSimulationSaveKey(sceneId) {
  if (sceneId === THREEFOLD_SLUICE_SCENE_ID) return SLUICE_SIMULATION_SAVE_KEY;
  if (sceneId === THREEFOLD_SILT_MARGIN_SCENE_ID)
    return SILT_MARGIN_SIMULATION_SAVE_KEY;
  if (sceneId === THREEFOLD_HEARTHGAPS_SCENE_ID)
    return HEARTHGAPS_SIMULATION_SAVE_KEY;
  if (sceneId === THREEFOLD_WEFTWAYS_SCENE_ID)
    return WEFTWAYS_SIMULATION_SAVE_KEY;
  if (sceneId === THREEFOLD_GRAINLANDS_SCENE_ID)
    return GRAINLANDS_SIMULATION_SAVE_KEY;
  if (isThreefoldHighWorldSceneId(sceneId))
    return `${SIMULATION_SAVE_KEY}.${sceneId}`;
  return SIMULATION_SAVE_KEY;
}
