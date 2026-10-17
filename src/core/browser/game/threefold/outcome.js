const GATE_GEOMETRY_IDS = ['gate-counterweight', 'relief-gate'];

/**
 * Derive the first irreversible gate outcome from canonical rubble and crisis time.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current simulation state.
 * @returns {{gateState: 'held'|'forced-open', drainageState: 'dry'|'at-risk'|'flooded'}} Gate and lower-channel outcome.
 */
export function getThreefoldGateOutcome(state) {
  const gateForcedOpen = GATE_GEOMETRY_IDS.some(id =>
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
