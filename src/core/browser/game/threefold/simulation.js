import { createCrisisClock, advanceCrisisClock } from './crisis.js';
import {
  advanceThreefoldEpisode,
  attemptThreefoldGateRepair,
  attemptThreefoldLatchfolkWarning,
  attemptThreefoldPassengerRescue,
  attemptThreefoldReport,
  attemptThreefoldWithdrawal,
  createThreefoldEpisodeState,
  THREEFOLD_GATE_REPAIR_GEOMETRY_IDS,
  THREEFOLD_LATCHFOLK_INTERACTABLE_ID,
} from './episode.js';
import { createBrokenGateScene } from './gatehouse.js';
import { THREEFOLD_SLUICE_SCENE_ID } from './sluice-scene.js';
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
  heightAtScale,
  moveAtScale,
  previewGrowthDamageIds,
  previewGrowthOverlapIds,
  recoverAnchor,
} from './spatial.js';

const ACTION_GAME_MINUTES = 0.25;
const ANCHOR_RECOVERY_MINUTES = 15;

/** @typedef {{scene: ReturnType<typeof createBrokenGateScene>, player: ReturnType<typeof import('./spatial.js').createScaleState>, crisis: ReturnType<typeof createCrisisClock>, episode: ReturnType<typeof createThreefoldEpisodeState>, encounter: ReturnType<typeof createThreefoldEncounter>}} BrokenGateSimulationState */
/** @typedef {{scene: ReturnType<typeof import('./sluice-scene.js').createThreefoldSluiceScene>, player: ReturnType<typeof import('./spatial.js').createScaleState>, crisis: ReturnType<typeof createCrisisClock>, episode: ReturnType<typeof createThreefoldEpisodeState>, encounter: ReturnType<typeof createThreefoldEncounter>, sluicePuzzle: ReturnType<typeof createThreefoldSluicePuzzle>, elapsedGameSeconds: number}} SluiceSimulationState */
/** @typedef {BrokenGateSimulationState|SluiceSimulationState} ThreefoldSimulationState */
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
 * @param {ReturnType<typeof createBrokenGateScene>|ReturnType<typeof import('./sluice-scene.js').createThreefoldSluiceScene>} [scene] Canonical scene.
 * @returns {ThreefoldSimulationState} Initial state for either authored scene.
 */
/**
 * @param {ThreefoldCrisisThresholds} thresholds Authored crisis-stage boundaries in game minutes.
 * @param {ReturnType<typeof createBrokenGateScene>|ReturnType<typeof import('./sluice-scene.js').createThreefoldSluiceScene>} [scene] Canonical scene.
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
      includeTestimony: scene.id !== THREEFOLD_SLUICE_SCENE_ID,
    }),
    encounter: createThreefoldEncounter(),
  };
  if (scene.id === THREEFOLD_SLUICE_SCENE_ID) {
    return /** @type {SluiceSimulationState} */ ({
      ...state,
      sluicePuzzle: createThreefoldSluicePuzzle(),
      elapsedGameSeconds: 0,
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
      creature.id === 'gatehouse-rat' &&
      state.encounter.ratFate !== 'present'
    )
      return false;
    if (growthDeathIds.has(creature.id)) return false;
    return isPlayerInsideCreature(state, creature);
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
 * Apply a command without adding witness records.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current simulation.
 * @param {ThreefoldWorldAction|null|undefined} action One bounded player command.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Updated simulation.
 */
function stepThreefoldAction(state, action) {
  if (isEpisodeClosed(state)) return state;
  if (!action || typeof action !== 'object') return state;
  if (action.type === 'menu' || action.type === 'pause') return state;
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
    const player = growThroughGeometry(
      state.player,
      growthGeometry(state),
      state.scene.baseBodyWidthMeters
    );
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
    const actionState =
      episode === state.episode && player === state.player
        ? state
        : { ...state, player, episode };
    const timedState = applyTimedAction(
      actionState,
      player,
      episode === state.episode ? 'failed-action' : 'interaction'
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
  if (isSluiceSimulationState(before)) return after;
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
    action: action.type,
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
  const isWait = action.type === 'wait';
  const elapsedGameMinutes = action.elapsedGameMinutes;
  const durationSeconds = isWait
    ? typeof elapsedGameMinutes === 'number'
      ? elapsedGameMinutes * 60
      : Number.NaN
    : ACTION_GAME_MINUTES * 60;
  if (
    !['move', 'grow', 'shrink', 'interact', 'wait'].includes(action.type) ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  )
    return state;

  let player = state.player;
  let sluicePuzzle = state.sluicePuzzle;
  if (action.type === 'move')
    player = movePlayerAtScene(state, action.direction);
  else if (action.type === 'grow')
    player = growThroughGeometry(
      player,
      growthGeometry(state),
      state.scene.baseBodyWidthMeters
    );
  else if (action.type === 'shrink') player = changeScale(player, -1);
  else if (action.type === 'interact' && canReachSluiceValve(state))
    sluicePuzzle = operateThreefoldSluiceValve(sluicePuzzle, player.scale);

  const playerWithRecovery = recoverAnchor(
    player,
    durationSeconds / 60,
    ANCHOR_RECOVERY_MINUTES,
    { inCombat: false }
  );
  return {
    ...state,
    player: playerWithRecovery,
    sluicePuzzle: advanceThreefoldSluicePuzzle(sluicePuzzle, durationSeconds),
    elapsedGameSeconds: state.elapsedGameSeconds + durationSeconds,
  };
}

/**
 * Check the scale and distance requirements for the service-valve interaction.
 * @param {SluiceSimulationState} state Current simulation.
 * @returns {boolean} Whether the player can reach the valve.
 */
function canReachSluiceValve(state) {
  if (state.player.scale !== -2) return false;
  const valve = state.scene.interactables.find(
    ({ id }) => id === 'sluice-service-valve'
  );
  if (!valve) return false;
  const reachMeters = heightAtScale(state.player.scale) * 0.55;
  return (
    Math.hypot(
      state.player.position.x - valve.position.x,
      state.player.position.y - valve.position.y
    ) <= reachMeters
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
  return state.scene.id === THREEFOLD_SLUICE_SCENE_ID
    ? state.scene.geometry.filter(({ id }) => id !== 'sluice-crossing-barrier')
    : state.scene.geometry;
}

/**
 * Return collision geometry while the lower crossing is unavailable.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current simulation.
 * @returns {Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>} Geometry active for movement.
 */
function movementGeometry(state) {
  if (!isSluiceSimulationState(state)) return state.scene.geometry;
  return getThreefoldSluicePuzzleStatus(state.sluicePuzzle, state.player.scale)
    .crossingAvailable
    ? growthGeometry(state)
    : state.scene.geometry;
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
  const elapsedGameMinutes = action.elapsedGameMinutes;
  if (
    typeof elapsedGameMinutes !== 'number' ||
    !Number.isFinite(elapsedGameMinutes) ||
    elapsedGameMinutes <= 0
  )
    return state;
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
