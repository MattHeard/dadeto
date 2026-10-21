import { createCrisisClock, advanceCrisisClock } from './crisis.js';
import {
  getThreefoldActionDurationSeconds,
  THREEFOLD_ACTION_GAME_SECONDS,
} from './campaign-clock.js';
import {
  advanceThreefoldEpisode,
  attemptThreefoldGateRepair,
  canHelpThreefoldDisplacedLatchfolk,
  canHearThreefoldLatchfolkLead,
  canSearchThreefoldFerryWreck,
  attemptThreefoldLatchfolkWarning,
  attemptThreefoldPassengerRescue,
  attemptThreefoldReport,
  attemptThreefoldWithdrawal,
  createThreefoldEpisodeState,
  THREEFOLD_GATE_REPAIR_GEOMETRY_IDS,
  THREEFOLD_LATCHFOLK_INTERACTABLE_ID,
} from './episode.js';
import { createBrokenGateScene } from './gatehouse.js';
import * as belltops from './belltops.js';
import * as crownbackReach from './crownback-reach.js';
import * as lanternWard from './lantern-ward.js';
import * as wakeformShoals from './wakeform-shoals.js';
import * as hearthgaps from './hearthgaps.js';
import * as weftways from './weftways.js';
import * as grainlands from './grainlands.js';
import { isThreefoldHighWorldSceneId } from './high-world-scenes.js';
import { isThreefoldInteractableInReach } from './scene-utils.js';
import {
  THREEFOLD_SLUICE_SCENE_ID,
  THREEFOLD_TIDAL_ARCHIVE_TRACE_ID,
} from './sluice-scene.js';
import {
  createThreefoldSiltMarginScene,
  createThreefoldSiltMarginState,
  normalizeThreefoldSiltMarginState,
  THREEFOLD_SILT_MARGIN_GUARDIAN_ID,
  THREEFOLD_SILT_MARGIN_SCENE_ID,
  THREEFOLD_SILT_MARGIN_ROOT_ARCH_ID,
  THREEFOLD_SILT_MARGIN_DEW_CROSSING_ID,
  THREEFOLD_SILT_MARGIN_FINE_VALVE_ID,
  THREEFOLD_SILT_MARGIN_SIGNAL_ID,
} from './silt-margin.js';
import {
  advanceThreefoldSiltMarginWater,
  getThreefoldSiltMarginWaterStatus,
  operateThreefoldSiltMarginValve,
} from './silt-margin-water.js';
import {
  advanceThreefoldSluicePuzzle,
  createThreefoldSluicePuzzle,
  getThreefoldSluicePuzzleStatus,
  operateThreefoldSluiceValve,
} from './water-puzzle.js';
import {
  createThreefoldEncounter,
  isGatehouseRatInReach,
  isPlayerInsideCreature,
  recordThreefoldGrowthDeaths,
  resolveGatehouseRat,
} from './encounter.js';
import { getThreefoldGateOutcome } from './outcome.js';
import { appendThreefoldWitnessEntry } from './witness-ledger.js';
import {
  changeScale,
  growThroughGeometry,
  moveAtScale,
  previewGrowthDamageIds,
  previewGrowthOverlapIds,
  recoverAnchor,
} from './spatial.js';

const ACTION_GAME_MINUTES = THREEFOLD_ACTION_GAME_SECONDS / 60;
const ANCHOR_RECOVERY_MINUTES = 15;

/** @typedef {{scene: ReturnType<typeof createBrokenGateScene>, player: ReturnType<typeof import('./spatial.js').createScaleState>, crisis: ReturnType<typeof createCrisisClock>, episode: ReturnType<typeof createThreefoldEpisodeState>, encounter: ReturnType<typeof createThreefoldEncounter>}} BrokenGateSimulationState */
/** @typedef {{scene: ReturnType<typeof import('./sluice-scene.js').createThreefoldSluiceScene>, player: ReturnType<typeof import('./spatial.js').createScaleState>, crisis: ReturnType<typeof createCrisisClock>, episode: ReturnType<typeof createThreefoldEpisodeState>, encounter: ReturnType<typeof createThreefoldEncounter>, sluicePuzzle: ReturnType<typeof createThreefoldSluicePuzzle>, archiveTraceHeard: boolean, elapsedGameSeconds: number}} SluiceSimulationState */
/** @typedef {{scene: ReturnType<typeof createThreefoldSiltMarginScene>, player: ReturnType<typeof import('./spatial.js').createScaleState>, crisis: ReturnType<typeof createCrisisClock>, episode: ReturnType<typeof createThreefoldEpisodeState>, encounter: ReturnType<typeof createThreefoldEncounter>, siltMargin: ReturnType<typeof createThreefoldSiltMarginState>, elapsedGameSeconds: number}} SiltMarginSimulationState */
/** @typedef {{scene: ReturnType<typeof hearthgaps.createThreefoldHearthgapsScene>, player: ReturnType<typeof import('./spatial.js').createScaleState>, crisis: ReturnType<typeof createCrisisClock>, episode: ReturnType<typeof createThreefoldEpisodeState>, encounter: ReturnType<typeof createThreefoldEncounter>, hearthgaps: ReturnType<typeof hearthgaps.createThreefoldHearthgapsState>, elapsedGameSeconds: number}} HearthgapsSimulationState */
/** @typedef {{scene: ReturnType<typeof weftways.createThreefoldWeftwaysScene>, player: ReturnType<typeof import('./spatial.js').createScaleState>, crisis: ReturnType<typeof createCrisisClock>, episode: ReturnType<typeof createThreefoldEpisodeState>, encounter: ReturnType<typeof createThreefoldEncounter>, weftways: ReturnType<typeof weftways.createThreefoldWeftwaysState>, elapsedGameSeconds: number}} WeftwaysSimulationState */
/** @typedef {{scene: ReturnType<typeof grainlands.createThreefoldGrainlandsScene>, player: ReturnType<typeof import('./spatial.js').createScaleState>, crisis: ReturnType<typeof createCrisisClock>, episode: ReturnType<typeof createThreefoldEpisodeState>, encounter: ReturnType<typeof createThreefoldEncounter>, grainlands: ReturnType<typeof grainlands.createThreefoldGrainlandsState>, elapsedGameSeconds: number}} GrainlandsSimulationState */
/** @typedef {{scene: ReturnType<typeof lanternWard.createThreefoldLanternWardScene>, player: ReturnType<typeof import('./spatial.js').createScaleState>, crisis: ReturnType<typeof createCrisisClock>, episode: ReturnType<typeof createThreefoldEpisodeState>, encounter: ReturnType<typeof createThreefoldEncounter>, elapsedGameSeconds: number}} LanternWardSimulationState */
/** @typedef {{scene: ReturnType<typeof belltops.createThreefoldBelltopsScene>, player: ReturnType<typeof import('./spatial.js').createScaleState>, crisis: ReturnType<typeof createCrisisClock>, episode: ReturnType<typeof createThreefoldEpisodeState>, encounter: ReturnType<typeof createThreefoldEncounter>, elapsedGameSeconds: number}} BelltopsSimulationState */
/** @typedef {{scene: ReturnType<typeof crownbackReach.createThreefoldCrownbackReachScene>, player: ReturnType<typeof import('./spatial.js').createScaleState>, crisis: ReturnType<typeof createCrisisClock>, episode: ReturnType<typeof createThreefoldEpisodeState>, encounter: ReturnType<typeof createThreefoldEncounter>, crownbackReach: ReturnType<typeof crownbackReach.createThreefoldCrownbackReachState>, elapsedGameSeconds: number}} CrownbackReachSimulationState */
/** @typedef {{scene: ReturnType<typeof wakeformShoals.createThreefoldWakeformShoalsScene>, player: ReturnType<typeof import('./spatial.js').createScaleState>, crisis: ReturnType<typeof createCrisisClock>, episode: ReturnType<typeof createThreefoldEpisodeState>, encounter: ReturnType<typeof createThreefoldEncounter>, wakeformShoals: ReturnType<typeof wakeformShoals.createThreefoldWakeformShoalsState>, elapsedGameSeconds: number}} WakeformShoalsSimulationState */
/** @typedef {LanternWardSimulationState|BelltopsSimulationState|CrownbackReachSimulationState|WakeformShoalsSimulationState} HighWorldSimulationState */
/** @typedef {BrokenGateSimulationState|SluiceSimulationState|SiltMarginSimulationState|HearthgapsSimulationState|WeftwaysSimulationState|GrainlandsSimulationState|HighWorldSimulationState} ThreefoldSimulationState */
/** @typedef {{urgentAtMinutes: number, surgeAtMinutes: number, aftermathAtMinutes: number}} ThreefoldCrisisThresholds */
/** @typedef {{type: string, direction?: string, elapsedGameMinutes?: number, preActionFrame?: Record<string, any>}} ThreefoldWorldAction */

/**
 * Create a fresh deterministic simulation for the canonical Broken Gate.
 * @overload
 * @param {ThreefoldCrisisThresholds} thresholds Authored crisis-stage boundaries in game minutes.
 * @param {ReturnType<typeof createBrokenGateScene>} [scene] Canonical Broken Gate scene.
 * @returns {BrokenGateSimulationState} Initial Broken Gate simulation state.
 */
/**
 * @overload
 * @param {ThreefoldCrisisThresholds} thresholds Authored crisis-stage boundaries in game minutes.
 * @param {ReturnType<typeof import('./sluice-scene.js').createThreefoldSluiceScene>} scene Canonical sluice scene.
 * @returns {SluiceSimulationState} Initial sluice simulation state.
 */
/**
 * @overload
 * @param {ThreefoldCrisisThresholds} thresholds Authored crisis-stage boundaries in game minutes.
 * @param {ReturnType<typeof createThreefoldSiltMarginScene>} scene Canonical Silt Margin scene.
 * @returns {SiltMarginSimulationState} Initial Silt Margin simulation state.
 */
/**
 * @overload
 * @param {ThreefoldCrisisThresholds} thresholds Authored crisis-stage boundaries in game minutes.
 * @param {ReturnType<typeof weftways.createThreefoldWeftwaysScene>} scene Canonical Weftways scene.
 * @returns {WeftwaysSimulationState} Initial Weftways simulation state.
 */
/**
 * @overload
 * @param {ThreefoldCrisisThresholds} thresholds Authored crisis-stage boundaries in game minutes.
 * @param {ReturnType<typeof grainlands.createThreefoldGrainlandsScene>} scene Canonical Grainlands scene.
 * @returns {GrainlandsSimulationState} Initial Grainlands simulation state.
 */
/**
 * @overload
 * @param {ThreefoldCrisisThresholds} thresholds Authored crisis-stage boundaries in game minutes.
 * @param {ReturnType<typeof lanternWard.createThreefoldLanternWardScene>} scene Authored Lantern Ward district.
 * @returns {LanternWardSimulationState} Initial Lantern Ward simulation state.
 */
/**
 * @overload
 * @param {ThreefoldCrisisThresholds} thresholds Authored crisis-stage boundaries in game minutes.
 * @param {ReturnType<typeof belltops.createThreefoldBelltopsScene>} scene Authored Belltops region.
 * @returns {BelltopsSimulationState} Initial Belltops simulation state.
 */
/**
 * @overload
 * @param {ThreefoldCrisisThresholds} thresholds Authored crisis-stage boundaries in game minutes.
 * @param {ReturnType<typeof crownbackReach.createThreefoldCrownbackReachScene>} scene Authored Crownback migration route.
 * @returns {CrownbackReachSimulationState} Initial Crownback Reach simulation state.
 */
/**
 * @overload
 * @param {ThreefoldCrisisThresholds} thresholds Authored crisis-stage boundaries in game minutes.
 * @param {ReturnType<typeof wakeformShoals.createThreefoldWakeformShoalsScene>} scene Authored offshore shoals route.
 * @returns {WakeformShoalsSimulationState} Initial Wakeform shoals simulation state.
 */
/**
 * @overload
 * @param {ThreefoldCrisisThresholds} thresholds Authored crisis-stage boundaries in game minutes.
 * @param {ReturnType<typeof createBrokenGateScene>|ReturnType<typeof import('./sluice-scene.js').createThreefoldSluiceScene>|ReturnType<typeof createThreefoldSiltMarginScene>|ReturnType<typeof hearthgaps.createThreefoldHearthgapsScene>|ReturnType<typeof weftways.createThreefoldWeftwaysScene>|ReturnType<typeof grainlands.createThreefoldGrainlandsScene>|ReturnType<typeof lanternWard.createThreefoldLanternWardScene>|ReturnType<typeof belltops.createThreefoldBelltopsScene>|ReturnType<typeof crownbackReach.createThreefoldCrownbackReachScene>|ReturnType<typeof wakeformShoals.createThreefoldWakeformShoalsScene>} [scene] Canonical scene.
 * @returns {ThreefoldSimulationState} Initial state for either authored scene.
 */
/**
 * @param {ThreefoldCrisisThresholds} thresholds Authored crisis-stage boundaries in game minutes.
 * @param {ReturnType<typeof createBrokenGateScene>|ReturnType<typeof import('./sluice-scene.js').createThreefoldSluiceScene>|ReturnType<typeof createThreefoldSiltMarginScene>|ReturnType<typeof hearthgaps.createThreefoldHearthgapsScene>|ReturnType<typeof weftways.createThreefoldWeftwaysScene>|ReturnType<typeof grainlands.createThreefoldGrainlandsScene>|ReturnType<typeof lanternWard.createThreefoldLanternWardScene>|ReturnType<typeof belltops.createThreefoldBelltopsScene>|ReturnType<typeof crownbackReach.createThreefoldCrownbackReachScene>|ReturnType<typeof wakeformShoals.createThreefoldWakeformShoalsScene>} [scene] Canonical scene.
 * @returns {ThreefoldSimulationState} Initial player, world, crisis, episode, and encounter state.
 */
export function createThreefoldSimulation(
  thresholds,
  scene = createBrokenGateScene()
) {
  const state = {
    scene,
    player: scene.spawn,
    crisis: createCrisisClock(thresholds),
    episode: createThreefoldEpisodeState({
      includeTestimony:
        scene.id !== THREEFOLD_SLUICE_SCENE_ID &&
        scene.id !== THREEFOLD_SILT_MARGIN_SCENE_ID &&
        scene.id !== hearthgaps.THREEFOLD_HEARTHGAPS_SCENE_ID &&
        scene.id !== weftways.THREEFOLD_WEFTWAYS_SCENE_ID &&
        scene.id !== grainlands.THREEFOLD_GRAINLANDS_SCENE_ID &&
        !isThreefoldHighWorldSceneId(scene.id),
    }),
    encounter: createThreefoldEncounter(),
  };
  if (scene.id === THREEFOLD_SLUICE_SCENE_ID) {
    return /** @type {SluiceSimulationState} */ ({
      ...state,
      sluicePuzzle: createThreefoldSluicePuzzle(),
      archiveTraceHeard: false,
      elapsedGameSeconds: 0,
    });
  }
  if (scene.id === THREEFOLD_SILT_MARGIN_SCENE_ID) {
    return /** @type {SiltMarginSimulationState} */ ({
      ...state,
      siltMargin: createThreefoldSiltMarginState(),
      elapsedGameSeconds: 0,
    });
  }
  if (scene.id === hearthgaps.THREEFOLD_HEARTHGAPS_SCENE_ID) {
    return /** @type {HearthgapsSimulationState} */ ({
      ...state,
      hearthgaps: hearthgaps.createThreefoldHearthgapsState(),
      elapsedGameSeconds: 0,
    });
  }
  if (scene.id === weftways.THREEFOLD_WEFTWAYS_SCENE_ID) {
    return /** @type {WeftwaysSimulationState} */ ({
      ...state,
      weftways: weftways.createThreefoldWeftwaysState(),
      elapsedGameSeconds: 0,
    });
  }
  if (scene.id === grainlands.THREEFOLD_GRAINLANDS_SCENE_ID) {
    return /** @type {GrainlandsSimulationState} */ ({
      ...state,
      grainlands: grainlands.createThreefoldGrainlandsState(),
      elapsedGameSeconds: 0,
    });
  }
  if (isThreefoldHighWorldSceneId(scene.id)) {
    const highWorldState = { ...state, elapsedGameSeconds: 0 };
    if (scene.id === crownbackReach.THREEFOLD_CROWNBACK_REACH_SCENE_ID)
      return /** @type {CrownbackReachSimulationState} */ ({
        ...highWorldState,
        crownbackReach: crownbackReach.createThreefoldCrownbackReachState(),
      });
    if (scene.id === wakeformShoals.THREEFOLD_WAKEFORM_SHOALS_SCENE_ID)
      return /** @type {WakeformShoalsSimulationState} */ ({
        ...highWorldState,
        wakeformShoals: wakeformShoals.createThreefoldWakeformShoalsState(),
      });
    return /** @type {HighWorldSimulationState} */ ({
      ...highWorldState,
    });
  }
  return /** @type {BrokenGateSimulationState} */ (state);
}

/**
 * Return the intact geometry affected by the next growth command while the episode is open.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current simulation.
 * @returns {string[]} Sorted geometry identifiers; an empty list after episode closure.
 */
export function previewThreefoldGrowthDamageIds(state) {
  return previewThreefoldGrowthEffects(state).geometryIds;
}

/**
 * Return the geometry, living occupant, and inside creatures affected by growth.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current simulation.
 * @returns {{geometryIds: string[], occupantIds: string[], creatureIds: string[]}} Sorted impacted identifiers.
 */
export function previewThreefoldGrowthEffects(state) {
  if (isEpisodeClosed(state))
    return { geometryIds: [], occupantIds: [], creatureIds: [] };
  const { player, scene } = state;
  const geometryIds = previewGrowthDamageIds(
    player,
    growthGeometry(state),
    scene.baseBodyWidthMeters
  );
  const watchkeeper = scene.interactables.find(
    ({ id }) => id === THREEFOLD_LATCHFOLK_INTERACTABLE_ID
  );
  const occupantIds =
    watchkeeper &&
    (state.episode.latchfolk === 'unwarned' ||
      state.episode.latchfolk === 'warned')
      ? previewGrowthOverlapIds(
          player,
          [watchkeeper],
          scene.baseBodyWidthMeters
        )
      : [];
  const growthDeathIds = new Set(
    (state.encounter.growthDeaths ?? []).map(({ creatureId }) => creatureId)
  );
  const eligibleCreatures = scene.creatures.filter(creature => {
    if (
      isSiltMarginSimulationState(state) &&
      creature.id === THREEFOLD_SILT_MARGIN_GUARDIAN_ID &&
      state.siltMargin.guardian !== 'present'
    )
      return false;
    if (
      isThreefoldGrainlandsSimulationState(state) &&
      creature.id === grainlands.THREEFOLD_GRAINLANDS_SPIDER_ID &&
      state.grainlands.spiderFate !== 'present'
    )
      return false;
    if (
      creature.id === 'gatehouse-rat' &&
      state.encounter.ratFate !== 'present'
    )
      return false;
    if (growthDeathIds.has(creature.id)) return false;
    return (
      /** @type {{growthRule?: string}} */ (creature).growthRule ===
        'overlap' || isPlayerInsideCreature(state, creature)
    );
  });
  const creatureIds = previewGrowthOverlapIds(
    player,
    eligibleCreatures,
    scene.baseBodyWidthMeters
  );
  return { geometryIds, occupantIds, creatureIds };
}

/**
 * Apply one explicit world command and advance crisis time deterministically.
 * Every movement/scale attempt takes a quarter in-game minute, including a
 * blocked or unavailable attempt. Menus, pause, and unknown commands are inert.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current simulation.
 * @param {ThreefoldWorldAction|null|undefined} action One bounded player command.
 * @returns {ReturnType<typeof createThreefoldSimulation>} New simulation state, or the original for inert commands.
 */
export function stepThreefoldSimulation(state, action) {
  const nextState = stepThreefoldAction(state, action);
  if (!action || !state || !nextState || state === nextState) return nextState;
  return recordGateWitnessEvent(state, nextState, action);
}

/**
 * Return the deterministic duration of a world action for campaign time.
 * Closed episodes and non-world commands do not advance the campaign clock.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current simulation.
 * @param {ThreefoldWorldAction|null|undefined} action Candidate player action.
 * @returns {number|null} Elapsed game seconds, or null for an inert action.
 */
export function getThreefoldWorldActionDurationSeconds(state, action) {
  if (!state || isEpisodeClosed(state)) return null;
  return getThreefoldActionDurationSeconds(action, state.scene.id);
}

/**
 * Apply a command without adding witness records.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current simulation.
 * @param {ThreefoldWorldAction|null|undefined} action One bounded player command.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Updated simulation.
 */
function stepThreefoldAction(state, action) {
  if (isEpisodeClosed(state)) return state;
  if (!action || typeof action !== 'object') return state;
  if (action.type === 'menu' || action.type === 'pause') return state;
  if (isHighWorldSimulationState(state))
    return stepHighWorldScene(state, action);
  if (isHearthgapsSimulationState(state))
    return stepFlowChoiceScene(
      state,
      action,
      state.hearthgaps.runoffChoice !== 'undecided',
      [
        {
          id: hearthgaps.THREEFOLD_HEARTHGAPS_BRIN_GATE_ID,
          update: () => ({
            hearthgaps: hearthgaps.normalizeThreefoldHearthgapsState({
              runoffChoice: 'brin-diversion',
            }),
          }),
        },
        {
          id: hearthgaps.THREEFOLD_HEARTHGAPS_SHARED_BYPASS_ID,
          update: () => ({
            hearthgaps: hearthgaps.normalizeThreefoldHearthgapsState({
              runoffChoice: 'shared-bypass',
            }),
          }),
        },
      ]
    );
  if (isWeftwaysSimulationState(state)) return stepWeftwaysScene(state, action);
  if (isThreefoldGrainlandsSimulationState(state))
    return stepGrainlandsScene(state, action);
  if (isSiltMarginSimulationState(state))
    return stepSiltMarginScene(state, action);
  if (isSluiceSimulationState(state)) return stepSluiceScene(state, action);
  if (action.type === 'wait') return advanceWait(state, action);
  if (action.type === 'fight' || action.type === 'bypass')
    return resolveEncounterAction(state, action.type);

  if (action.type === 'move') {
    const player = movePlayerAtScene(state, action.direction);
    return applyPlayerAction(state, player, 'travel');
  }

  if (action.type === 'grow') {
    const { occupantIds, creatureIds } = previewThreefoldGrowthEffects(state);
    const player = growPlayerAtScene(state);
    let actionState = state;
    if (occupantIds.includes(THREEFOLD_LATCHFOLK_INTERACTABLE_ID))
      actionState = {
        ...actionState,
        episode: {
          ...actionState.episode,
          latchfolk: /** @type {'lost'} */ ('lost'),
        },
      };
    if (creatureIds.length > 0) {
      const encounter = creatureIds.includes('gatehouse-rat')
        ? resolveGatehouseRat(
            actionState.encounter,
            'growth',
            state.player.scale
          )
        : actionState.encounter;
      actionState = {
        ...actionState,
        encounter: recordThreefoldGrowthDeaths(encounter, creatureIds),
      };
    }
    return applyPlayerAction(actionState, player, 'interaction');
  }

  if (action.type === 'shrink') {
    const player = changeScale(state.player, -1);
    return applyPlayerAction(state, player, 'interaction');
  }

  if (action.type === 'interact') {
    let episode = attemptThreefoldPassengerRescue(state);
    if (episode === state.episode)
      episode = attemptThreefoldLatchfolkWarning(state);
    if (episode === state.episode) episode = attemptThreefoldWithdrawal(state);
    if (episode === state.episode) episode = attemptThreefoldReport(state);
    let player = state.player;
    if (episode === state.episode) {
      episode = attemptThreefoldGateRepair(state);
      if (episode !== state.episode) player = restoreGateGeometry(state.player);
    }
    const heardLatchfolkLead =
      episode === state.episode &&
      player === state.player &&
      canHearThreefoldLatchfolkLead(state);
    const searchedFerryWreck =
      episode === state.episode &&
      player === state.player &&
      canSearchThreefoldFerryWreck(state);
    const helpedDisplacedLatchfolk =
      episode === state.episode &&
      player === state.player &&
      canHelpThreefoldDisplacedLatchfolk(state);
    const witnessEntry =
      heardLatchfolkLead || searchedFerryWreck || helpedDisplacedLatchfolk
        ? createWitnessEntry(state, state, action)
        : null;
    const actionEpisode = witnessEntry
      ? appendThreefoldWitnessEntry(state.episode, witnessEntry)
      : episode;
    const actionState =
      actionEpisode === state.episode && player === state.player
        ? state
        : { ...state, player, episode: actionEpisode };
    const timedState = applyTimedAction(
      actionState,
      player,
      episode === state.episode && !witnessEntry
        ? 'failed-action'
        : 'interaction'
    );
    return episode.withdrawn === true
      ? settleWithdrawalStorm(timedState)
      : timedState;
  }

  return state;
}

/**
 * Record the authored gate breach, later visible outcomes, and repair as facts.
 * @param {ReturnType<typeof createThreefoldSimulation>} before Prior simulation.
 * @param {ReturnType<typeof createThreefoldSimulation>} after Resulting simulation.
 * @param {ThreefoldWorldAction} action Chosen world command and its visible pre-action frame.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Result with appended witness history when consequential.
 */
function recordGateWitnessEvent(before, after, action) {
  if (before.scene.id !== 'broken-gate') return after;
  const nextEntryId = `witness-${(before.episode.witnessLedger || []).length + 1}`;
  if (after.episode.witnessLedger?.some(entry => entry.id === nextEntryId))
    return after;
  const entry = createWitnessEntry(before, after, action);
  if (!entry) return after;
  return {
    ...after,
    episode: appendThreefoldWitnessEntry(after.episode, entry),
  };
}

/**
 * Build one ordered record from pre-action knowledge and the resulting facts.
 * @param {ReturnType<typeof createThreefoldSimulation>} before Prior simulation.
 * @param {ReturnType<typeof createThreefoldSimulation>} after Resulting simulation.
 * @param {ThreefoldWorldAction} action Chosen world command and visible pre-action frame.
 * @returns {Record<string, any>|null} Deterministic witness entry, if this action creates one.
 */
function createWitnessEntry(before, after, action) {
  const ledger = before.episode.witnessLedger || [];
  const damagedGeometryIds = after.player.destroyedGeometryIds
    .filter(
      (/** @type {string} */ id) =>
        !before.player.destroyedGeometryIds.includes(id) &&
        isGateRepairGeometryId(id)
    )
    .sort();
  const repairedGate =
    before.episode.gateRepaired !== true && after.episode.gateRepaired === true;
  const latchfolkLead =
    action.type === 'interact' && canHearThreefoldLatchfolkLead(before);
  const ferryWreckSearch =
    action.type === 'interact' && canSearchThreefoldFerryWreck(before);
  const latchfolkDisplacementAid =
    action.type === 'interact' && canHelpThreefoldDisplacedLatchfolk(before);
  const breach = [...ledger]
    .reverse()
    .find(
      entry =>
        entry.type === 'choice' &&
        entry.consequence.damagedGeometryIds.some(isGateRepairGeometryId)
    );
  let type = /** @type {'choice'|'observation'|'repair'|null} */ (null);
  let intention = '';
  let intendedOutcome = '';
  let relatedEventId = null;
  if (damagedGeometryIds.length > 0) {
    type = 'choice';
    intention = 'Increase Mara scale by one rung.';
    intendedOutcome =
      'Grow by one scale step; the visible preview lists the affected pieces and beings.';
  } else if (repairedGate) {
    type = 'repair';
    intention = 'Repair the relief gate at its locking pawl.';
    intendedOutcome = 'Restore the relief gate mechanism.';
    relatedEventId = breach?.id ?? null;
  } else if (latchfolkDisplacementAid) {
    type = 'observation';
    intention = 'Help the displaced Latchfolk arrange temporary shelter.';
    intendedOutcome =
      'Support the safe residents after the lower homes flood without restoring damaged homes.';
  } else if (latchfolkLead) {
    type = 'observation';
    intention = 'Ask the surviving watchkeeper about a faint relay call.';
    intendedOutcome = 'Hear an optional lead about a signal asking for Iri.';
  } else if (ferryWreckSearch) {
    type = 'observation';
    intention = 'Search the lost ferry wreck for its passengers.';
    intendedOutcome =
      'Confirm the passenger groups recorded as safe or lost without changing their outcomes.';
  } else if (breach && hasVisibleGateOutcomeChanged(before, after)) {
    type = 'observation';
    intention = describeChosenAction(action);
    intendedOutcome =
      'Observe the deterministic gate, channel, and settlement outcomes after this action.';
    relatedEventId = breach.id;
  }
  if (!type) return null;
  const frame = action.preActionFrame || {};
  const displayedState = frame.threefold || {};
  const preview = previewThreefoldGrowthEffects(before);
  const gateOutcome = getThreefoldGateOutcome(before);
  const afterGateOutcome = getThreefoldGateOutcome(after);
  return {
    id: `witness-${ledger.length + 1}`,
    type,
    atGameMinute: after.crisis.elapsedMinutes,
    action: latchfolkDisplacementAid
      ? 'latchfolk-displacement-aid'
      : latchfolkLead
        ? 'latchfolk-witness-lead'
        : ferryWreckSearch
          ? 'ferry-wreck-search'
          : action.type,
    intention,
    intendedOutcome,
    knowledge: {
      scale: displayedState.scale ?? before.player.scale,
      crisisStage: displayedState.crisisStage ?? before.crisis.stage,
      elapsedMinutes:
        displayedState.elapsedMinutes ?? before.crisis.elapsedMinutes,
      displayedStatus: typeof frame.toast === 'string' ? frame.toast : null,
      previewedGeometryIds:
        displayedState.growthPreviewIds ?? preview.geometryIds,
      previewedOccupantIds:
        displayedState.growthPreviewOccupantIds ?? preview.occupantIds,
      previewedCreatureIds:
        displayedState.growthPreviewCreatureIds ?? preview.creatureIds,
      gateState: displayedState.gateState ?? gateOutcome.gateState,
      drainageState: displayedState.drainageState ?? gateOutcome.drainageState,
      passengers: before.episode.passengers,
      ferry: before.episode.ferry,
      latchfolk: before.episode.latchfolk,
    },
    consequence: {
      scale: after.player.scale,
      crisisStage: after.crisis.stage,
      elapsedMinutes: after.crisis.elapsedMinutes,
      damagedGeometryIds,
      gateState: afterGateOutcome.gateState,
      drainageState: afterGateOutcome.drainageState,
      passengers: after.episode.passengers,
      ferry: after.episode.ferry,
      latchfolk: after.episode.latchfolk,
    },
    relatedEventId,
  };
}

/**
 * Identify geometry whose damage affects the authored gate outcome.
 * @param {string} id Physical geometry identifier.
 * @returns {boolean} Whether this geometry represents a breachable gate part.
 */
function isGateRepairGeometryId(id) {
  return (
    id === THREEFOLD_GATE_REPAIR_GEOMETRY_IDS[0] ||
    id === THREEFOLD_GATE_REPAIR_GEOMETRY_IDS[1]
  );
}

/**
 * Check for newly visible effects of a previously recorded gate breach.
 * @param {ReturnType<typeof createThreefoldSimulation>} before Prior simulation.
 * @param {ReturnType<typeof createThreefoldSimulation>} after Resulting simulation.
 * @returns {boolean} Whether a new crisis or gate consequence was observed.
 */
function hasVisibleGateOutcomeChanged(before, after) {
  const beforeGate = getThreefoldGateOutcome(before);
  const afterGate = getThreefoldGateOutcome(after);
  return (
    before.crisis.stage !== after.crisis.stage ||
    beforeGate.drainageState !== afterGate.drainageState ||
    before.episode.passengers !== after.episode.passengers ||
    before.episode.ferry !== after.episode.ferry ||
    before.episode.latchfolk !== after.episode.latchfolk
  );
}

/**
 * Describe the exact operation observed when a gate outcome changes.
 * @param {{type: string, direction?: string, elapsedGameMinutes?: number}} action Chosen command.
 * @returns {string} Player-selected operation without inferred motive.
 */
function describeChosenAction(action) {
  if (action.type === 'wait')
    return `Wait ${action.elapsedGameMinutes} in-game minutes.`;
  if (action.type === 'move')
    return `Move ${action.direction || 'through the scene'}.`;
  return `Choose ${action.type}.`;
}

/**
 * Apply one bounded action in the physically simulated small-world sluice.
 * Every world action represents fifteen explicit game seconds; waits use their
 * supplied in-game duration. No browser or wall-clock time enters this reducer.
 * @param {SluiceSimulationState} state Current simulation.
 * @param {{type: string, direction?: string, elapsedGameMinutes?: number}} action Player command.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Updated sluice state.
 */
function stepSluiceScene(state, action) {
  return commitSmallWorldSceneAction(state, action, prepared => {
    let sluicePuzzle = state.sluicePuzzle;
    const crossingAvailable = getThreefoldSluicePuzzleStatus(
      sluicePuzzle,
      state.player.scale
    ).crossingAvailable;
    if (action.type === 'interact' && canReachSluiceValve(state))
      sluicePuzzle = operateThreefoldSluiceValve(
        sluicePuzzle,
        prepared.player.scale
      );
    return {
      sluicePuzzle: advanceThreefoldSluicePuzzle(
        sluicePuzzle,
        prepared.durationSeconds
      ),
      archiveTraceHeard:
        state.archiveTraceHeard ||
        (action.type === 'interact' &&
          crossingAvailable &&
          isThreefoldInteractableInReach(
            state,
            THREEFOLD_TIDAL_ARCHIVE_TRACE_ID
          )),
    };
  });
}

/**
 * Apply one explicit Silt Margin action. World time is deterministic and only
 * advances in response to player commands; the browser clock is not observed.
 * @param {SiltMarginSimulationState} state Current Silt Margin run.
 * @param {{type: string, direction?: string, elapsedGameMinutes?: number}} action Player command.
 * @returns {SiltMarginSimulationState} Updated Silt Margin state.
 */
function stepSiltMarginScene(state, action) {
  return /** @type {SiltMarginSimulationState} */ (
    commitSmallWorldSceneAction(state, action, prepared => {
      let siltMargin = state.siltMargin;
      let waterPuzzle = siltMargin.waterPuzzle;
      let encounter = state.encounter;
      if (prepared.creatureIds.includes(THREEFOLD_SILT_MARGIN_GUARDIAN_ID)) {
        encounter = recordThreefoldGrowthDeaths(
          encounter,
          prepared.creatureIds
        );
        siltMargin = normalizeThreefoldSiltMarginState({
          guardian: 'killed',
          signal: 'disrupted',
        });
      } else if (action.type === 'interact') {
        if (
          siltMargin.guardian === 'present' &&
          isThreefoldInteractableInReach(
            state,
            THREEFOLD_SILT_MARGIN_GUARDIAN_ID
          )
        ) {
          siltMargin = { ...siltMargin, guardian: 'guided-aside' };
        } else if (
          isThreefoldInteractableInReach(
            state,
            THREEFOLD_SILT_MARGIN_FINE_VALVE_ID
          )
        ) {
          waterPuzzle = operateThreefoldSiltMarginValve(
            waterPuzzle,
            state.player.scale
          );
        } else if (
          siltMargin.guardian === 'guided-aside' &&
          siltMargin.signal === 'blocked' &&
          getThreefoldSiltMarginWaterStatus(waterPuzzle).crossingAvailable &&
          isThreefoldInteractableInReach(state, THREEFOLD_SILT_MARGIN_SIGNAL_ID)
        ) {
          siltMargin = { ...siltMargin, signal: 'sent' };
        } else if (
          siltMargin.guardian === 'guided-aside' &&
          siltMargin.signal === 'sent' &&
          !siltMargin.quietingEvidenceHeard &&
          isThreefoldInteractableInReach(state, THREEFOLD_SILT_MARGIN_SIGNAL_ID)
        ) {
          siltMargin = { ...siltMargin, quietingEvidenceHeard: true };
        }
      }
      return {
        encounter,
        siltMargin: {
          ...siltMargin,
          waterPuzzle: advanceThreefoldSiltMarginWater(
            waterPuzzle,
            prepared.durationSeconds
          ),
        },
      };
    })
  );
}

/**
 * Resolve Iru's baiting choice or the scale-growth spider encounter.
 * @param {GrainlandsSimulationState} state Current Grainlands route.
 * @param {{type: string, direction?: string, elapsedGameMinutes?: number}} action Player command.
 * @returns {GrainlandsSimulationState} Updated encounter, bridge, and local time.
 */
function stepGrainlandsScene(state, action) {
  return /** @type {GrainlandsSimulationState} */ (
    commitSmallWorldSceneAction(state, action, prepared => {
      let grainlandsState = state.grainlands;
      let encounter = state.encounter;
      if (
        prepared.geometryIds.includes(grainlands.THREEFOLD_GRAINLANDS_BRIDGE_ID)
      )
        grainlandsState = grainlands.normalizeThreefoldGrainlandsState({
          ...grainlandsState,
          bridgeOutcome: 'broken',
        });
      if (
        prepared.creatureIds.includes(grainlands.THREEFOLD_GRAINLANDS_SPIDER_ID)
      ) {
        encounter = recordThreefoldGrowthDeaths(
          encounter,
          prepared.creatureIds
        );
        grainlandsState = grainlands.normalizeThreefoldGrainlandsState({
          ...grainlandsState,
          spiderFate: 'overpowered',
        });
      }
      if (
        action.type === 'interact' &&
        grainlandsState.spiderFate === 'present' &&
        isThreefoldInteractableInReach(
          state,
          grainlands.THREEFOLD_GRAINLANDS_IRU_ID
        )
      )
        grainlandsState = grainlands.normalizeThreefoldGrainlandsState({
          ...grainlandsState,
          spiderFate: 'baited-away',
        });
      return { encounter, grainlands: grainlandsState };
    })
  );
}

/**
 * Commit one reachable channel decision for an authored runoff route.
 * @param {HearthgapsSimulationState|WeftwaysSimulationState} state Current runoff region.
 * @param {{type: string, direction?: string, elapsedGameMinutes?: number}} action Player command.
 * @param {boolean} choiceMade Whether the one-time decision is already committed.
 * @param {Array<{id: string, update: () => Record<string, any>}>} controls Ordered physical choice controls.
 * @returns {HearthgapsSimulationState|WeftwaysSimulationState} Updated route or original for unsupported actions.
 */
function stepFlowChoiceScene(state, action, choiceMade, controls) {
  return /** @type {HearthgapsSimulationState|WeftwaysSimulationState} */ (
    commitSmallWorldSceneAction(state, action, () => {
      if (action.type !== 'interact' || choiceMade) return {};
      const control = controls.find(({ id }) =>
        isThreefoldInteractableInReach(state, id)
      );
      return control?.update() ?? {};
    })
  );
}

/**
 * Resolve the Weftways choice, reveal Pell's record, and accept one response.
 * @param {WeftwaysSimulationState} state Current caravan crossing.
 * @param {{type: string, direction?: string, elapsedGameMinutes?: number}} action Player command.
 * @returns {WeftwaysSimulationState} Updated crossing or the original for unsupported actions.
 */
function stepWeftwaysScene(state, action) {
  return /** @type {WeftwaysSimulationState} */ (
    commitSmallWorldSceneAction(state, action, ({ creatureIds }) => {
      if (action.type !== 'interact')
        return creatureIds.length > 0
          ? {
              encounter: recordThreefoldGrowthDeaths(
                state.encounter,
                creatureIds
              ),
            }
          : {};
      const route = state.weftways;
      const pellDied = weftways.hasThreefoldWeftwaysPellGrowthDeath(
        state.encounter
      );
      if (route.flowChoice === 'undecided') {
        const choice = [
          {
            id: weftways.THREEFOLD_WEFTWAYS_PELL_BYPASS_ID,
            flowChoice: 'pell-bypass',
          },
          {
            id: weftways.THREEFOLD_WEFTWAYS_QUAY_SPILL_ID,
            flowChoice: 'quay-spill',
          },
        ].find(({ id }) => isThreefoldInteractableInReach(state, id));
        return choice
          ? {
              weftways: weftways.normalizeThreefoldWeftwaysState({
                flowChoice: choice.flowChoice,
                relayRecordRead: route.relayRecordRead,
              }),
            }
          : {};
      }
      if (
        !route.relayRecordRead &&
        isThreefoldInteractableInReach(
          state,
          pellDied
            ? weftways.THREEFOLD_WEFTWAYS_CARAVAN_CIRCLE_ID
            : weftways.THREEFOLD_WEFTWAYS_PELL_ID
        )
      )
        return {
          weftways: weftways.normalizeThreefoldWeftwaysState({
            ...route,
            relayRecordRead: true,
          }),
        };
      if (
        route.relayRecordRead &&
        !route.relayRecordShared &&
        !route.relayRecordConcealed &&
        !route.relayRecordDestroyed &&
        !route.relayRestitutionNegotiated &&
        isThreefoldInteractableInReach(
          state,
          weftways.THREEFOLD_WEFTWAYS_CARAVAN_CIRCLE_ID
        )
      )
        return {
          weftways: weftways.normalizeThreefoldWeftwaysState({
            ...route,
            relayRecordShared: true,
          }),
        };
      if (
        route.relayRecordRead &&
        !route.relayRecordShared &&
        !route.relayRecordConcealed &&
        !route.relayRecordDestroyed &&
        !route.relayRestitutionNegotiated &&
        isThreefoldInteractableInReach(
          state,
          weftways.THREEFOLD_WEFTWAYS_PRIVATE_CACHE_ID
        )
      )
        return {
          weftways: weftways.normalizeThreefoldWeftwaysState({
            ...route,
            relayRecordConcealed: true,
          }),
        };
      if (
        route.relayRecordRead &&
        !route.relayRecordShared &&
        !route.relayRecordConcealed &&
        !route.relayRecordDestroyed &&
        !route.relayRestitutionNegotiated &&
        isThreefoldInteractableInReach(
          state,
          weftways.THREEFOLD_WEFTWAYS_BRAZIER_ID
        )
      )
        return {
          weftways: weftways.normalizeThreefoldWeftwaysState({
            ...route,
            relayRecordDestroyed: true,
          }),
        };
      if (
        route.relayRecordRead &&
        !route.relayRecordShared &&
        !route.relayRecordConcealed &&
        !route.relayRecordDestroyed &&
        !route.relayRestitutionNegotiated &&
        isThreefoldInteractableInReach(
          state,
          weftways.THREEFOLD_WEFTWAYS_RESTITUTION_TABLE_ID
        )
      )
        return {
          weftways: weftways.normalizeThreefoldWeftwaysState({
            ...route,
            relayRestitutionNegotiated: true,
          }),
        };
      return {};
    })
  );
}

/**
 * Apply high-world movement and scale changes without invoking Broken Gate
 * episode or crisis consequences. Resident fates are recorded from the same
 * overlap preview used by the handheld warning.
 * @param {HighWorldSimulationState} state Current district state.
 * @param {{type: string, direction?: string, elapsedGameMinutes?: number}} action Player command.
 * @returns {HighWorldSimulationState} Updated district state.
 */
function stepHighWorldScene(state, action) {
  if (action.type === 'interact') {
    if (
      state.scene.id === belltops.THREEFOLD_BELLTOPS_SCENE_ID &&
      belltops.isThreefoldBelltopsRegulatorInReach(state)
    )
      return /** @type {HighWorldSimulationState} */ ({
        ...state,
        elapsedGameSeconds: state.elapsedGameSeconds + ACTION_GAME_MINUTES * 60,
      });
    if (state.scene.id === crownbackReach.THREEFOLD_CROWNBACK_REACH_SCENE_ID) {
      if (
        /** @type {CrownbackReachSimulationState} */ (state).crownbackReach
          ?.tharnMet === true ||
        !crownbackReach.isThreefoldCrownbackTharnInReach(state)
      )
        return state;
      return /** @type {CrownbackReachSimulationState} */ ({
        ...state,
        crownbackReach: { tharnMet: true },
        elapsedGameSeconds: state.elapsedGameSeconds + ACTION_GAME_MINUTES * 60,
      });
    }
    if (state.scene.id === wakeformShoals.THREEFOLD_WAKEFORM_SHOALS_SCENE_ID) {
      const shoalsState = /** @type {WakeformShoalsSimulationState} */ (state)
        .wakeformShoals;
      if (
        shoalsState.wakeformDiverted ||
        !wakeformShoals.isThreefoldWakeformInReach(state)
      )
        return state;
      return /** @type {WakeformShoalsSimulationState} */ ({
        ...state,
        scene: wakeformShoals.createThreefoldWakeformShoalsScene({
          wakeformDiverted: true,
        }),
        wakeformShoals: { ...shoalsState, wakeformDiverted: true },
        elapsedGameSeconds: state.elapsedGameSeconds + ACTION_GAME_MINUTES * 60,
      });
    }
    return state;
  }
  return /** @type {HighWorldSimulationState} */ (
    commitSmallWorldSceneAction(
      state,
      action,
      ({ creatureIds, geometryIds }) => {
        const changes = /** @type {Record<string, any>} */ ({
          encounter:
            creatureIds.length > 0
              ? recordThreefoldGrowthDeaths(state.encounter, creatureIds)
              : state.encounter,
        });
        if (
          state.scene.id ===
            wakeformShoals.THREEFOLD_WAKEFORM_SHOALS_SCENE_ID &&
          geometryIds.includes(wakeformShoals.THREEFOLD_SHOALS_TIDEWALL_ID)
        )
          changes.wakeformShoals = {
            .../** @type {WakeformShoalsSimulationState} */ (state)
              .wakeformShoals,
            outerDefenseBreached: true,
          };
        return changes;
      }
    )
  );
}

/**
 * Resolve and commit one small-world action with scene-specific state changes.
 * @param {SluiceSimulationState|SiltMarginSimulationState|HearthgapsSimulationState|WeftwaysSimulationState|GrainlandsSimulationState|HighWorldSimulationState} state Current region.
 * @param {{type: string, direction?: string, elapsedGameMinutes?: number}} action Player command.
 * @param {(prepared: {durationSeconds: number, player: ReturnType<typeof import('./spatial.js').createScaleState>, geometryIds: string[], creatureIds: string[]}) => Record<string, any>} updateScene Region-specific consequences.
 * @returns {SluiceSimulationState|SiltMarginSimulationState|HearthgapsSimulationState|WeftwaysSimulationState|GrainlandsSimulationState|HighWorldSimulationState} Updated scene or the original for unsupported actions.
 */
function commitSmallWorldSceneAction(state, action, updateScene) {
  const durationSeconds = smallWorldActionDurationSeconds(action);
  if (durationSeconds === null) return state;
  const player = applySmallWorldPhysicalAction(state, action);
  const growth =
    action.type === 'grow' && player !== state.player
      ? previewThreefoldGrowthEffects(state)
      : { geometryIds: [], creatureIds: [] };
  const sceneChanges = updateScene({
    durationSeconds,
    player,
    geometryIds: growth.geometryIds,
    creatureIds: growth.creatureIds,
  });
  return commitSmallWorldAction(state, player, durationSeconds, sceneChanges);
}

/**
 * Apply shared movement and scale changes for a small-world scene.
 * @param {SluiceSimulationState|SiltMarginSimulationState|HearthgapsSimulationState|WeftwaysSimulationState|GrainlandsSimulationState|HighWorldSimulationState} state Current scene.
 * @param {{type: string, direction?: string}} action Player command.
 * @returns {ReturnType<typeof import('./spatial.js').createScaleState>} Updated player.
 */
function applySmallWorldPhysicalAction(state, action) {
  if (action.type === 'move') return movePlayerAtScene(state, action.direction);
  if (action.type === 'grow') return growPlayerAtScene(state);
  return action.type === 'shrink'
    ? changeScale(state.player, -1)
    : state.player;
}

/**
 * Apply one scale increase against the current scene's growth-sensitive geometry.
 * @param {ThreefoldSimulationState} state Current simulation.
 * @returns {ReturnType<typeof import('./spatial.js').createScaleState>} Updated player.
 */
function growPlayerAtScene(state) {
  return growThroughGeometry(
    state.player,
    growthGeometry(state),
    state.scene.baseBodyWidthMeters
  );
}

/**
 * Resolve the explicit game-time cost for a supported small-world command.
 * @param {{type: string, elapsedGameMinutes?: number}} action Candidate action.
 * @returns {number|null} Positive elapsed seconds, or null for invalid commands.
 */
function smallWorldActionDurationSeconds(action) {
  if (!['move', 'grow', 'shrink', 'interact', 'wait'].includes(action.type))
    return null;
  return getThreefoldActionDurationSeconds(action, 'small-world');
}

/**
 * Recover a small-world player's Anchor from deliberate game time.
 * @param {ReturnType<typeof import('./spatial.js').createScaleState>} player Current player state.
 * @param {number} elapsedGameSeconds Explicit command duration.
 * @returns {ReturnType<typeof import('./spatial.js').createScaleState>} Recovered player.
 */
function recoverSmallWorldAnchor(player, elapsedGameSeconds) {
  return recoverAnchor(
    player,
    elapsedGameSeconds / 60,
    ANCHOR_RECOVERY_MINUTES,
    { inCombat: false }
  );
}

/**
 * Commit a small-world action with shared Anchor recovery and elapsed seconds.
 * @param {SluiceSimulationState|SiltMarginSimulationState|HearthgapsSimulationState|WeftwaysSimulationState|GrainlandsSimulationState|HighWorldSimulationState} state Prior scene state.
 * @param {ReturnType<typeof import('./spatial.js').createScaleState>} player Action result.
 * @param {number} durationSeconds Explicit game-time cost.
 * @param {Record<string, any>} sceneChanges Scene-specific state changes.
 * @returns {SluiceSimulationState|SiltMarginSimulationState|HearthgapsSimulationState|WeftwaysSimulationState|GrainlandsSimulationState|HighWorldSimulationState} Updated scene state.
 */
function commitSmallWorldAction(state, player, durationSeconds, sceneChanges) {
  return {
    ...state,
    ...sceneChanges,
    player: recoverSmallWorldAnchor(player, durationSeconds),
    elapsedGameSeconds: state.elapsedGameSeconds + durationSeconds,
  };
}

/**
 * Check the scale and distance requirements for the service-valve interaction.
 * @param {SluiceSimulationState} state Current simulation.
 * @returns {boolean} Whether the player can reach the valve.
 */
function canReachSluiceValve(state) {
  return (
    state.player.scale === -2 &&
    isThreefoldInteractableInReach(state, 'sluice-service-valve')
  );
}

/**
 * Move the player through the currently active scene geometry.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current simulation.
 * @param {unknown} direction Cardinal input candidate.
 * @returns {ReturnType<typeof import('./spatial.js').createScaleState>} Updated player position.
 */
function movePlayerAtScene(state, direction) {
  return moveAtScale(
    state.player,
    typeof direction === 'string' ? direction : '',
    movementGeometry(state),
    state.scene
  );
}

/**
 * Return geometry that can be damaged by scale growth.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current simulation.
 * @returns {Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>} Growth-sensitive geometry.
 */
function growthGeometry(state) {
  if (state.scene.id === THREEFOLD_SLUICE_SCENE_ID)
    return state.scene.geometry.filter(
      ({ id }) => id !== 'sluice-crossing-barrier'
    );
  if (isSiltMarginSimulationState(state))
    return state.scene.geometry.filter(
      ({ id }) => id !== THREEFOLD_SILT_MARGIN_DEW_CROSSING_ID
    );
  return state.scene.geometry;
}

/**
 * Return collision geometry while the lower crossing is unavailable.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current simulation.
 * @returns {Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>} Geometry active for movement.
 */
function movementGeometry(state) {
  if (isSluiceSimulationState(state))
    return getThreefoldSluicePuzzleStatus(
      state.sluicePuzzle,
      state.player.scale
    ).crossingAvailable
      ? growthGeometry(state)
      : state.scene.geometry;
  if (isSiltMarginSimulationState(state)) {
    const overRootArch =
      state.player.scale >= -3 &&
      state.player.destroyedGeometryIds.includes(
        THREEFOLD_SILT_MARGIN_ROOT_ARCH_ID
      );
    const crossingOpen =
      overRootArch ||
      getThreefoldSiltMarginWaterStatus(state.siltMargin.waterPuzzle)
        .crossingAvailable;
    return crossingOpen
      ? state.scene.geometry.filter(
          ({ id }) => id !== THREEFOLD_SILT_MARGIN_DEW_CROSSING_ID
        )
      : state.scene.geometry;
  }
  return state.scene.geometry;
}

/**
 * Narrow a simulation by its authored scene discriminator.
 * @param {ThreefoldSimulationState} state Current simulation.
 * @returns {state is SluiceSimulationState} Whether the state owns hydraulic simulation data.
 */
export function isSluiceSimulationState(state) {
  return state.scene.id === THREEFOLD_SLUICE_SCENE_ID;
}

/**
 * Narrow a simulation by its Silt Margin scene discriminator.
 * @param {ThreefoldSimulationState} state Current simulation.
 * @returns {state is SiltMarginSimulationState} Whether the state owns Silt Margin branch data.
 */
export function isSiltMarginSimulationState(state) {
  return state.scene.id === THREEFOLD_SILT_MARGIN_SCENE_ID;
}

/**
 * Narrow a simulation by its authored Hearthgaps region discriminator.
 * @param {ThreefoldSimulationState} state Current simulation.
 * @returns {state is HearthgapsSimulationState} Whether the state owns runoff and flood outcomes.
 */
export function isHearthgapsSimulationState(state) {
  return state.scene.id === hearthgaps.THREEFOLD_HEARTHGAPS_SCENE_ID;
}

/**
 * Narrow a simulation by its authored Weftways region discriminator.
 * @param {ThreefoldSimulationState} state Current simulation.
 * @returns {state is WeftwaysSimulationState} Whether the state owns Weftways flow outcomes.
 */
export function isWeftwaysSimulationState(state) {
  return state.scene.id === weftways.THREEFOLD_WEFTWAYS_SCENE_ID;
}

/**
 * Narrow a simulation by its authored Grainlands region discriminator.
 * @param {ThreefoldSimulationState} state Current simulation.
 * @returns {state is GrainlandsSimulationState} Whether the state owns the spider and nursery outcomes.
 */
export function isThreefoldGrainlandsSimulationState(state) {
  return state.scene.id === grainlands.THREEFOLD_GRAINLANDS_SCENE_ID;
}

/**
 * Narrow a simulation by its authored Lantern Ward scene discriminator.
 * @param {ThreefoldSimulationState} state Current simulation.
 * @returns {state is LanternWardSimulationState} Whether the state uses the district-scale route.
 */
export function isLanternWardSimulationState(state) {
  return state.scene.id === lanternWard.THREEFOLD_LANTERN_WARD_SCENE_ID;
}

/**
 * Narrow a simulation by its authored Belltops scene discriminator.
 * @param {ThreefoldSimulationState} state Current simulation.
 * @returns {state is BelltopsSimulationState} Whether the state uses the +2 harbor region.
 */
export function isBelltopsSimulationState(state) {
  return state.scene.id === belltops.THREEFOLD_BELLTOPS_SCENE_ID;
}

/**
 * Narrow simulations that use the independent high-world region clock.
 * @param {ThreefoldSimulationState} state Current simulation.
 * @returns {state is HighWorldSimulationState} Whether the state belongs to an authored high-world scene.
 */
export function isHighWorldSimulationState(state) {
  return (
    isLanternWardSimulationState(state) ||
    isBelltopsSimulationState(state) ||
    state.scene.id === crownbackReach.THREEFOLD_CROWNBACK_REACH_SCENE_ID ||
    state.scene.id === wakeformShoals.THREEFOLD_WAKEFORM_SHOALS_SCENE_ID
  );
}

/**
 * Resolve the single authored rat encounter and charge deterministic game time.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current simulation.
 * @param {'fight'|'bypass'} choice Player choice.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Updated simulation.
 */
function resolveEncounterAction(state, choice) {
  if (!isGatehouseRatInReach(state))
    return applyTimedAction(state, state.player, 'failed-action');
  const encounter = resolveGatehouseRat(
    state.encounter,
    choice,
    state.player.scale
  );
  const next = { ...state, encounter };
  return applyTimedAction(
    next,
    state.player,
    choice === 'fight' ? 'combat' : 'travel',
    { inCombat: choice === 'fight' }
  );
}

/**
 * Restore the gate and counterweight after their locking pawl is repaired.
 * @param {ReturnType<import('./spatial.js').createScaleState>} player Current scale state.
 * @returns {ReturnType<import('./spatial.js').createScaleState>} Scale state with repaired gate geometry restored.
 */
function restoreGateGeometry(player) {
  return {
    ...player,
    destroyedGeometryIds: player.destroyedGeometryIds.filter(
      id => !THREEFOLD_GATE_REPAIR_GEOMETRY_IDS.includes(id)
    ),
  };
}

/**
 * Simulate the unattended crisis after Mara leaves through the upland road.
 * @param {ReturnType<typeof createThreefoldSimulation>} state State after the departure action.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Withdrawn episode settled at aftermath.
 */
function settleWithdrawalStorm(state) {
  const elapsedGameMinutes =
    state.crisis.thresholds.aftermathAtMinutes - state.crisis.elapsedMinutes;
  const crisis =
    elapsedGameMinutes > 0
      ? advanceCrisisClock(state.crisis, {
          type: 'wait',
          elapsedGameMinutes,
        })
      : state.crisis;
  return applyCrisisSnapshot(state, state.player, crisis);
}

/**
 * Advance the crisis by a deliberate in-world wait.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current simulation.
 * @param {{elapsedGameMinutes?: number}} action Requested wait duration.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Updated state, or the original for an invalid duration.
 */
function advanceWait(state, action) {
  const durationSeconds = smallWorldActionDurationSeconds({
    type: 'wait',
    elapsedGameMinutes: action.elapsedGameMinutes,
  });
  if (durationSeconds === null) return state;
  const elapsedGameMinutes = durationSeconds / 60;
  const crisis = advanceCrisisClock(state.crisis, {
    type: 'wait',
    elapsedGameMinutes,
  });
  const player = recoverAnchor(
    state.player,
    elapsedGameMinutes,
    ANCHOR_RECOVERY_MINUTES,
    { inCombat: false }
  );
  return applyCrisisSnapshot(state, player, crisis);
}

/**
 * Commit one attempted world action and its game-time cost.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Prior simulation.
 * @param {ReturnType<import('./spatial.js').createScaleState>} player Resulting scale state.
 * @param {'travel'|'combat'|'interaction'|'failed-action'} eventType Crisis event kind.
 * @param {{inCombat?: boolean}} [context] Anchor recovery context.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Updated simulation.
 */
function applyTimedAction(state, player, eventType, { inCombat = false } = {}) {
  const recoveredPlayer = recoverAnchor(
    player,
    ACTION_GAME_MINUTES,
    ANCHOR_RECOVERY_MINUTES,
    { inCombat }
  );
  const crisis = advanceCrisisClock(state.crisis, {
    type: eventType,
    elapsedGameMinutes: ACTION_GAME_MINUTES,
  });
  return applyCrisisSnapshot(state, recoveredPlayer, crisis);
}

/**
 * Apply one crisis tick and resolve its dependent episode outcomes.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Prior simulation.
 * @param {ReturnType<import('./spatial.js').createScaleState>} player Resulting player state.
 * @param {ReturnType<typeof createCrisisClock>} crisis Resulting deterministic clock.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Updated simulation or the original when unchanged.
 */
function applyCrisisSnapshot(state, player, crisis) {
  const episode = advanceThreefoldEpisode(state.episode, crisis);
  return player === state.player &&
    crisis === state.crisis &&
    episode === state.episode
    ? state
    : { ...state, player, crisis, episode };
}

/**
 * Resolve the time event for a successful or failed player command.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Prior simulation.
 * @param {ReturnType<import('./spatial.js').createScaleState>} player Command result.
 * @param {'travel'|'interaction'} successType Event to record when the state changes.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Updated simulation.
 */
function applyPlayerAction(state, player, successType) {
  return applyTimedAction(
    state,
    player,
    player === state.player ? 'failed-action' : successType
  );
}

/**
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current simulation.
 * @returns {boolean} Whether the episode has stopped accepting world actions.
 */
function isEpisodeClosed(state) {
  return (
    state.episode.withdrawn === true || state.episode.closedBy !== undefined
  );
}
