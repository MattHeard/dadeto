import { heightAtScale } from './spatial.js';

const PASSENGER_OUTCOMES = new Set(['aboard', 'evacuated', 'lost']);
const FERRY_OUTCOMES = new Set(['afloat', 'lost']);
const MOORING_ID = 'ferry-mooring-line';

/**
 * Create the opening passenger and ferry state for the Broken Gate episode.
 * @returns {{passengers: 'aboard'|'evacuated'|'lost', ferry: 'afloat'|'lost'}} Initial episode state.
 */
export function createThreefoldEpisodeState() {
  return { passengers: 'aboard', ferry: 'afloat' };
}

/**
 * Rescue passengers from the ferry when Mara reaches its mooring before surge.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @returns {ReturnType<typeof createThreefoldEpisodeState>} Updated episode state or the original value when rescue is unavailable.
 */
export function attemptThreefoldPassengerRescue(state) {
  const { episode, player, scene, crisis } = state;
  const mooring = scene.interactables?.find(item => item.id === MOORING_ID);
  if (
    episode.passengers !== 'aboard' ||
    crisis.elapsedMinutes >= crisis.thresholds.surgeAtMinutes ||
    !mooring
  )
    return episode;

  const reachMeters = heightAtScale(player.scale) * 0.55;
  const distance = Math.hypot(
    player.position.x - mooring.position.x,
    player.position.y - mooring.position.y
  );
  if (distance > reachMeters) return episode;
  return { ...episode, passengers: 'evacuated' };
}

/**
 * Resolve the ferry's surge outcome while retaining passengers already evacuated.
 * @param {ReturnType<typeof createThreefoldEpisodeState>} episode Current passenger and ferry state.
 * @param {ReturnType<import('./crisis.js').createCrisisClock>} crisis Current deterministic crisis clock.
 * @returns {ReturnType<typeof createThreefoldEpisodeState>} Updated or unchanged episode state.
 */
export function advanceThreefoldEpisode(episode, crisis) {
  if (crisis.stage !== 'surge' && crisis.stage !== 'aftermath') return episode;
  const passengers =
    episode.passengers === 'aboard' ? 'lost' : episode.passengers;
  if (episode.ferry === 'lost' && episode.passengers === passengers)
    return episode;
  return { passengers, ferry: 'lost' };
}

/**
 * Rebuild and validate saved passenger and ferry outcomes.
 * @param {unknown} candidate Saved episode state.
 * @returns {ReturnType<typeof createThreefoldEpisodeState>} Canonical episode state.
 */
export function normalizeThreefoldEpisodeState(candidate) {
  if (!candidate || typeof candidate !== 'object')
    throw new TypeError('Episode outcome state is required.');
  const state = /** @type {Record<string, unknown>} */ (candidate);
  if (
    typeof state.passengers !== 'string' ||
    !PASSENGER_OUTCOMES.has(state.passengers) ||
    typeof state.ferry !== 'string' ||
    !FERRY_OUTCOMES.has(state.ferry)
  )
    throw new RangeError('Episode outcome state is invalid.');
  return /** @type {ReturnType<typeof createThreefoldEpisodeState>} */ ({
    passengers: state.passengers,
    ferry: state.ferry,
  });
}
