import { isThreefoldInteractableInReach } from './scene-utils.js';
import {
  EPISODE_CLOSURES,
  FERRY_OUTCOMES,
  LATCHFOLK_OUTCOMES,
  PASSENGER_OUTCOMES,
} from './episode-values.js';
import { normalizeThreefoldWitnessLedger } from './witness-ledger.js';
import { createThreefoldTestimony } from './testimony.js';
export const THREEFOLD_SIGNAL_STATION_GEOMETRY_ID = 'signal-station';
/** Stable identifier for the authored Latchfolk watchkeeper interactable. */
export const THREEFOLD_LATCHFOLK_INTERACTABLE_ID = 'latchfolk-watchkeeper';
export const THREEFOLD_GATE_REPAIR_GEOMETRY_IDS = [
  'gate-counterweight',
  'relief-gate',
];
const MOORING_ID = 'ferry-mooring-line';
const UPLAND_ROAD_ID = 'upland-road-exit';
const GATE_REPAIR_ID = 'relief-gate-locking-pawl';

/** @typedef {{passengers: 'aboard'|'partial'|'evacuated'|'lost', ferry: 'afloat'|'lost', latchfolk: 'unwarned'|'warned'|'safe'|'lost', withdrawn?: true, gateRepaired?: true, gateRepairedBeforeSurge?: true, closedBy?: 'reported'|'departed', witnessLedger?: Array<Record<string, any>>, testimony?: ReturnType<import('./testimony.js').createThreefoldTestimony>}} ThreefoldEpisodeState */

/**
 * Create the opening passenger and ferry state for the Broken Gate episode.
 * @param {object} [options] Scene-specific authored data options.
 * @param {boolean} [options.includeTestimony] Whether to include Broken Gate testimony; false keeps the separate sluice scene isolated.
 * @returns {ThreefoldEpisodeState} Initial episode state.
 */
export function createThreefoldEpisodeState(options = {}) {
  const includeTestimony = options.includeTestimony ?? true;
  return {
    passengers: 'aboard',
    ferry: 'afloat',
    latchfolk: 'unwarned',
    ...(includeTestimony ? { testimony: createThreefoldTestimony() } : {}),
  };
}

/**
 * Rescue one passenger group from the ferry at its mooring before surge.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @returns {ReturnType<typeof createThreefoldEpisodeState>} Updated episode state or the original value when rescue is unavailable.
 */
export function attemptThreefoldPassengerRescue(state) {
  const { episode, crisis } = state;
  if (
    (episode.passengers !== 'aboard' && episode.passengers !== 'partial') ||
    crisis.elapsedMinutes >= crisis.thresholds.surgeAtMinutes ||
    !isThreefoldInteractableInReach(state, MOORING_ID)
  )
    return episode;
  return {
    ...episode,
    passengers: episode.passengers === 'aboard' ? 'partial' : 'evacuated',
  };
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
    !isThreefoldInteractableInReach(state, THREEFOLD_LATCHFOLK_INTERACTABLE_ID)
  )
    return episode;
  return { ...episode, latchfolk: 'warned' };
}

/**
 * Check whether Mara can hear the surviving watchkeeper's optional relay lead.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @returns {boolean} Whether the post-storm witness interaction is available.
 */
export function canHearThreefoldLatchfolkLead(state) {
  return (
    state.scene.id === 'broken-gate' &&
    state.crisis.stage === 'aftermath' &&
    state.episode.latchfolk === 'safe' &&
    state.episode.closedBy === undefined &&
    !state.episode.witnessLedger?.some(
      entry => entry.action === 'latchfolk-witness-lead'
    ) &&
    isThreefoldInteractableInReach(state, THREEFOLD_LATCHFOLK_INTERACTABLE_ID)
  );
}

/**
 * Check whether Mara can search the lost ferry for its passengers.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @returns {boolean} Whether the post-surge wreck search is available.
 */
export function canSearchThreefoldFerryWreck(state) {
  return (
    canInteractInThreefoldAftermath(state, MOORING_ID) &&
    state.episode.ferry === 'lost' &&
    !state.episode.witnessLedger?.some(
      entry => entry.action === 'ferry-wreck-search'
    )
  );
}

/**
 * Check whether Mara can help Latchfolk displaced by the lower-channel flood.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @returns {boolean} Whether the optional aftermath aid interaction is available.
 */
export function canHelpThreefoldDisplacedLatchfolk(state) {
  const { episode, player } = state;
  const gateWasForcedOpen = THREEFOLD_GATE_REPAIR_GEOMETRY_IDS.some(id =>
    player.destroyedGeometryIds.includes(id)
  );
  const homesWereFlooded =
    episode.gateRepaired === true
      ? episode.gateRepairedBeforeSurge !== true
      : gateWasForcedOpen;
  return (
    canInteractInThreefoldAftermath(
      state,
      THREEFOLD_LATCHFOLK_INTERACTABLE_ID
    ) &&
    episode.latchfolk === 'safe' &&
    homesWereFlooded &&
    !episode.witnessLedger?.some(
      entry => entry.action === 'latchfolk-displacement-aid'
    )
  );
}

/**
 * Check whether an in-range Broken Gate aftermath interaction is still open.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @param {string} interactableId Target interaction identifier.
 * @returns {boolean} Whether the target can be used during the open aftermath.
 */
function canInteractInThreefoldAftermath(state, interactableId) {
  return (
    state.scene.id === 'broken-gate' &&
    state.crisis.stage === 'aftermath' &&
    state.episode.closedBy === undefined &&
    isThreefoldInteractableInReach(state, interactableId)
  );
}

/**
 * Withdraw from the gatehouse when Mara reaches the upland road.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @returns {ReturnType<typeof createThreefoldEpisodeState>} Updated episode state or the original value when withdrawal is unavailable.
 */
export function attemptThreefoldWithdrawal(state) {
  const { episode } = state;
  if (!isThreefoldInteractableInReach(state, UPLAND_ROAD_ID)) return episode;
  return { ...episode, withdrawn: true, closedBy: 'departed' };
}

/**
 * File the episode report after the storm while the signal station still stands.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @returns {ReturnType<typeof createThreefoldEpisodeState>} Reported episode state or the original when reporting is unavailable.
 */
export function attemptThreefoldReport(state) {
  const { episode, crisis, player } = state;
  if (
    crisis.stage !== 'aftermath' ||
    player.destroyedGeometryIds.includes(
      THREEFOLD_SIGNAL_STATION_GEOMETRY_ID
    ) ||
    !isThreefoldInteractableInReach(state, 'signal-station-console')
  )
    return episode;
  return { ...episode, closedBy: 'reported' };
}

/**
 * Repair the forced-open relief gate by freeing its locking pawl.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @returns {ReturnType<typeof createThreefoldEpisodeState>} Repaired episode state or the original value when repair is unavailable.
 */
export function attemptThreefoldGateRepair(state) {
  const { episode, crisis } = state;
  if (episode.gateRepaired === true) return episode;
  const beforeSurge = crisis.stage === 'rising' || crisis.stage === 'urgent';
  const afterSurge = crisis.stage === 'surge' || crisis.stage === 'aftermath';
  if (!beforeSurge && !afterSurge) return episode;
  if (beforeSurge ? episode.ferry === 'lost' : episode.ferry !== 'lost')
    return episode;
  if (state.player.scale !== -2) return episode;
  const gateWasForcedOpen = THREEFOLD_GATE_REPAIR_GEOMETRY_IDS.some(id =>
    state.player.destroyedGeometryIds.includes(id)
  );
  if (!gateWasForcedOpen) return episode;
  if (!isThreefoldInteractableInReach(state, GATE_REPAIR_ID)) return episode;
  return {
    ...episode,
    gateRepaired: true,
    ...(beforeSurge ? { gateRepairedBeforeSurge: true } : {}),
  };
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
 * @param {object} [options] Scene-specific normalization options.
 * @param {boolean} [options.includeTestimony] Whether to reconstruct Broken Gate testimony; false omits it for the separate sluice scene.
 * @returns {ReturnType<typeof createThreefoldEpisodeState>} Canonical episode state.
 */
export function normalizeThreefoldEpisodeState(candidate, options = {}) {
  const includeTestimony = options.includeTestimony ?? true;
  if (!candidate || typeof candidate !== 'object')
    throw new TypeError('Episode outcome state is required.');
  const state = /** @type {Record<string, unknown>} */ (candidate);
  const latchfolk =
    state.latchfolk === undefined ? 'unwarned' : state.latchfolk;
  const withdrawn = state.withdrawn === undefined ? false : state.withdrawn;
  const gateRepaired =
    state.gateRepaired === undefined ? false : state.gateRepaired;
  const gateRepairedBeforeSurge =
    state.gateRepairedBeforeSurge === undefined
      ? false
      : state.gateRepairedBeforeSurge;
  const closedBy =
    state.closedBy === undefined && withdrawn === true
      ? 'departed'
      : state.closedBy;
  const witnessLedger = normalizeThreefoldWitnessLedger(state.witnessLedger);
  const testimony = includeTestimony ? createThreefoldTestimony() : undefined;
  if (
    typeof state.passengers !== 'string' ||
    !PASSENGER_OUTCOMES.has(state.passengers) ||
    typeof state.ferry !== 'string' ||
    !FERRY_OUTCOMES.has(state.ferry) ||
    typeof latchfolk !== 'string' ||
    !LATCHFOLK_OUTCOMES.has(latchfolk) ||
    typeof withdrawn !== 'boolean' ||
    typeof gateRepaired !== 'boolean' ||
    typeof gateRepairedBeforeSurge !== 'boolean' ||
    (gateRepairedBeforeSurge && !gateRepaired) ||
    (closedBy !== undefined &&
      (typeof closedBy !== 'string' ||
        !EPISODE_CLOSURES.has(closedBy) ||
        (closedBy === 'departed' && withdrawn !== true) ||
        (closedBy === 'reported' && withdrawn === true)))
  )
    throw new RangeError('Episode outcome state is invalid.');
  return /** @type {ReturnType<typeof createThreefoldEpisodeState>} */ ({
    passengers: state.passengers,
    ferry: state.ferry,
    latchfolk,
    ...(withdrawn ? { withdrawn: true } : {}),
    ...(gateRepaired ? { gateRepaired: true } : {}),
    ...(gateRepairedBeforeSurge ? { gateRepairedBeforeSurge: true } : {}),
    ...(closedBy ? { closedBy } : {}),
    ...(witnessLedger.length > 0 ? { witnessLedger } : {}),
    ...(testimony ? { testimony } : {}),
  });
}
