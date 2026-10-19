import { createCrisisClock, advanceCrisisClock } from './crisis.js';
import {
  advanceThreefoldEpisode,
  attemptThreefoldLatchfolkWarning,
  attemptThreefoldPassengerRescue,
  attemptThreefoldWithdrawal,
  createThreefoldEpisodeState,
} from './episode.js';
import { createBrokenGateScene } from './gatehouse.js';
import {
  changeScale,
  growThroughGeometry,
  moveAtScale,
  recoverAnchor,
} from './spatial.js';

const ACTION_GAME_MINUTES = 0.25;
const ANCHOR_RECOVERY_MINUTES = 15;

/**
 * Create a fresh deterministic simulation for the authored Broken Gate.
 * @param {{urgentAtMinutes: number, surgeAtMinutes: number, aftermathAtMinutes: number}} thresholds Authored crisis-stage boundaries in game minutes.
 * @param {ReturnType<typeof createBrokenGateScene>} [scene] Canonical gatehouse scene.
 * @returns {{scene: ReturnType<typeof createBrokenGateScene>, player: ReturnType<typeof import('./spatial.js').createScaleState>, crisis: ReturnType<typeof createCrisisClock>, episode: ReturnType<typeof createThreefoldEpisodeState>}} Initial player, world, crisis, and episode state.
 */
export function createThreefoldSimulation(
  thresholds,
  scene = createBrokenGateScene()
) {
  return {
    scene,
    player: scene.spawn,
    crisis: createCrisisClock(thresholds),
    episode: createThreefoldEpisodeState(),
  };
}

/**
 * Apply one explicit world command and advance crisis time deterministically.
 * Every movement/scale attempt takes a quarter in-game minute, including a
 * blocked or unavailable attempt. Menus, pause, and unknown commands are inert.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current simulation.
 * @param {{type: string, direction?: string, elapsedGameMinutes?: number}|null|undefined} action One bounded player command.
 * @returns {ReturnType<typeof createThreefoldSimulation>} New simulation state, or the original for inert commands.
 */
export function stepThreefoldSimulation(state, action) {
  if (state.episode.withdrawn === true) return state;
  if (!action || typeof action !== 'object') return state;
  if (action.type === 'menu' || action.type === 'pause') return state;
  if (action.type === 'wait') return advanceWait(state, action);

  if (action.type === 'move') {
    const player = moveAtScale(
      state.player,
      typeof action.direction === 'string' ? action.direction : '',
      state.scene.geometry,
      state.scene
    );
    return applyPlayerAction(state, player, 'travel');
  }

  if (action.type === 'grow') {
    const player = growThroughGeometry(
      state.player,
      state.scene.geometry,
      state.scene.baseBodyWidthMeters
    );
    return applyPlayerAction(state, player, 'interaction');
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
    const actionState =
      episode === state.episode ? state : { ...state, episode };
    const timedState = applyTimedAction(
      actionState,
      state.player,
      episode === state.episode ? 'failed-action' : 'interaction'
    );
    return episode.withdrawn === true
      ? settleWithdrawalStorm(timedState)
      : timedState;
  }

  return state;
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
 * @param {'travel'|'interaction'|'failed-action'} eventType Crisis event kind.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Updated simulation.
 */
function applyTimedAction(state, player, eventType) {
  const recoveredPlayer = recoverAnchor(
    player,
    ACTION_GAME_MINUTES,
    ANCHOR_RECOVERY_MINUTES,
    { inCombat: false }
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
