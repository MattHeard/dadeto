import { heightAtScale } from './spatial.js';

const PASSENGER_OUTCOMES = new Set(['aboard', 'evacuated', 'lost']);
const FERRY_OUTCOMES = new Set(['afloat', 'lost']);
const LATCHFOLK_OUTCOMES = new Set(['unwarned', 'warned', 'safe', 'lost']);
const MOORING_ID = 'ferry-mooring-line';
const LATCHFOLK_ID = 'latchfolk-watchkeeper';
const UPLAND_ROAD_ID = 'upland-road-exit';

/**
 * Create the opening passenger and ferry state for the Broken Gate episode.
 * @returns {{passengers: 'aboard'|'evacuated'|'lost', ferry: 'afloat'|'lost', latchfolk: 'unwarned'|'warned'|'safe'|'lost', withdrawn?: true}} Initial episode state.
 */
export function createThreefoldEpisodeState() {
  return { passengers: 'aboard', ferry: 'afloat', latchfolk: 'unwarned' };
}

/**
 * Rescue passengers from the ferry when Mara reaches its mooring before surge.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @returns {ReturnType<typeof createThreefoldEpisodeState>} Updated episode state or the original value when rescue is unavailable.
 */
export function attemptThreefoldPassengerRescue(state) {
  const { episode, crisis } = state;
  if (
    episode.passengers !== 'aboard' ||
    crisis.elapsedMinutes >= crisis.thresholds.surgeAtMinutes ||
    !isWithinInteractionRange(state, MOORING_ID)
  )
    return episode;
  return { ...episode, passengers: 'evacuated' };
}

/**
 * Warn the Latchfolk watchkeeper before the lower settlement is hit by the surge.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @returns {ReturnType<typeof createThreefoldEpisodeState>} Updated episode state or the original value when warning is unavailable.
 */
export function attemptThreefoldLatchfolkWarning(state) {
  const { episode, crisis } = state;
  if (
    episode.latchfolk !== 'unwarned' ||
    crisis.elapsedMinutes >= crisis.thresholds.surgeAtMinutes ||
    !isWithinInteractionRange(state, LATCHFOLK_ID)
  )
    return episode;
  return { ...episode, latchfolk: 'warned' };
}

/**
 * Withdraw from the gatehouse when Mara reaches the upland road.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @returns {ReturnType<typeof createThreefoldEpisodeState>} Updated episode state or the original value when withdrawal is unavailable.
 */
export function attemptThreefoldWithdrawal(state) {
  const { episode } = state;
  if (!isWithinInteractionRange(state, UPLAND_ROAD_ID)) return episode;
  return { ...episode, withdrawn: true };
}

/**
 * Resolve ferry and settlement outcomes while retaining successful warnings.
 * @param {ReturnType<typeof createThreefoldEpisodeState>} episode Current episode outcomes.
 * @param {ReturnType<import('./crisis.js').createCrisisClock>} crisis Current deterministic crisis clock.
 * @returns {ReturnType<typeof createThreefoldEpisodeState>} Updated or unchanged episode state.
 */
export function advanceThreefoldEpisode(episode, crisis) {
  if (crisis.stage !== 'surge' && crisis.stage !== 'aftermath') return episode;
  const passengers =
    episode.passengers === 'aboard' ? 'lost' : episode.passengers;
  const latchfolk =
    episode.latchfolk === 'warned'
      ? 'safe'
      : episode.latchfolk === 'unwarned'
        ? 'lost'
        : episode.latchfolk;
  if (
    episode.ferry === 'lost' &&
    episode.passengers === passengers &&
    episode.latchfolk === latchfolk
  )
    return episode;
  return { ...episode, passengers, ferry: 'lost', latchfolk };
}

/**
 * Rebuild and validate saved passenger, ferry, and withdrawal outcomes.
 * @param {unknown} candidate Saved episode state.
 * @returns {ReturnType<typeof createThreefoldEpisodeState>} Canonical episode state.
 */
export function normalizeThreefoldEpisodeState(candidate) {
  if (!candidate || typeof candidate !== 'object')
    throw new TypeError('Episode outcome state is required.');
  const state = /** @type {Record<string, unknown>} */ (candidate);
  const latchfolk =
    state.latchfolk === undefined ? 'unwarned' : state.latchfolk;
  const withdrawn = state.withdrawn === undefined ? false : state.withdrawn;
  if (
    typeof state.passengers !== 'string' ||
    !PASSENGER_OUTCOMES.has(state.passengers) ||
    typeof state.ferry !== 'string' ||
    !FERRY_OUTCOMES.has(state.ferry) ||
    typeof latchfolk !== 'string' ||
    !LATCHFOLK_OUTCOMES.has(latchfolk) ||
    typeof withdrawn !== 'boolean'
  )
    throw new RangeError('Episode outcome state is invalid.');
  return /** @type {ReturnType<typeof createThreefoldEpisodeState>} */ ({
    passengers: state.passengers,
    ferry: state.ferry,
    latchfolk,
    ...(withdrawn ? { withdrawn: true } : {}),
  });
}

/**
 * Check whether Mara can reach one authored interaction target at her current scale.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @param {string} id Authored interaction target identifier.
 * @returns {boolean} Whether the target exists and is within reach.
 */
function isWithinInteractionRange(state, id) {
  const target = state.scene.interactables.find(item => item.id === id);
  if (!target) return false;
  const reachMeters = heightAtScale(state.player.scale) * 0.55;
  return (
    Math.hypot(
      state.player.position.x - target.position.x,
      state.player.position.y - target.position.y
    ) <= reachMeters
  );
}
