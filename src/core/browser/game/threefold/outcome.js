import { THREEFOLD_GATE_REPAIR_GEOMETRY_IDS } from './episode.js';

/**
 * Derive the first irreversible gate outcome from canonical rubble and crisis time.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current simulation state.
 * @returns {{gateState: 'held'|'forced-open'|'repaired', drainageState: 'dry'|'at-risk'|'flooded'|'receded'}} Gate and lower-channel outcome.
 */
export function getThreefoldGateOutcome(state) {
  if (state.episode.gateRepaired === true) {
    return {
      gateState: 'repaired',
      drainageState: state.crisis.stage === 'aftermath' ? 'receded' : 'flooded',
    };
  }
  const gateForcedOpen = THREEFOLD_GATE_REPAIR_GEOMETRY_IDS.some(id =>
    state.player.destroyedGeometryIds.includes(id)
  );
  if (!gateForcedOpen) {
    return { gateState: 'held', drainageState: 'dry' };
  }

  const floodReachedDrainage =
    state.crisis.stage === 'surge' || state.crisis.stage === 'aftermath';
  return {
    gateState: 'forced-open',
    drainageState: floodReachedDrainage ? 'flooded' : 'at-risk',
  };
}
