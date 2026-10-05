/**
 * Advance the shared tick and movement cooldown for one game frame.
 * @param {Record<string, any>} state Current game state.
 * @param {number} deltaMs Elapsed time in milliseconds.
 * @returns {any} State with frame counters advanced.
 */
export function advanceSimulationFrame(state, deltaMs) {
  return {
    ...state,
    tick: state.tick + 1,
    moveCooldown: Math.max(0, state.moveCooldown - deltaMs),
  };
}
