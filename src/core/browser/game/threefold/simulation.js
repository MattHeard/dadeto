import { createCrisisClock, advanceCrisisClock } from './crisis.js';
import { createBrokenGateScene } from './gatehouse.js';
import { changeScale, growThroughGeometry, moveAtScale } from './spatial.js';

const ACTION_GAME_MINUTES = 0.25;

/**
 * Create a fresh deterministic simulation for the authored Broken Gate.
 * @param {{urgentAtMinutes: number, surgeAtMinutes: number, aftermathAtMinutes: number}} thresholds Authored crisis-stage boundaries in game minutes.
 * @param {ReturnType<typeof createBrokenGateScene>} [scene] Canonical gatehouse scene.
 * @returns {{scene: ReturnType<typeof createBrokenGateScene>, player: ReturnType<import('./spatial.js').createScaleState>, crisis: ReturnType<typeof createCrisisClock>}} Initial player, world, and crisis state.
 */
export function createThreefoldSimulation(
  thresholds,
  scene = createBrokenGateScene()
) {
  return {
    scene,
    player: scene.spawn,
    crisis: createCrisisClock(thresholds),
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

  return state;
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
  return crisis === state.crisis ? state : { ...state, crisis };
}

/**
 * Commit one attempted world action and its game-time cost.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Prior simulation.
 * @param {ReturnType<import('./spatial.js').createScaleState>} player Resulting scale state.
 * @param {'travel'|'interaction'|'failed-action'} eventType Crisis event kind.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Updated simulation.
 */
function applyTimedAction(state, player, eventType) {
  const crisis = advanceCrisisClock(state.crisis, {
    type: eventType,
    elapsedGameMinutes: ACTION_GAME_MINUTES,
  });
  return { ...state, player, crisis };
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
