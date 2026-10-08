/**
 * Create the shared clock and input fields for a new game state.
 * @returns {{ mode: string, tick: number, moveCooldown: number, lastActions: string[] }} Initial simulation fields.
 */
export function createSimulationClockState() {
  return {
    mode: 'world',
    tick: 0,
    moveCooldown: 0,
    lastActions: [],
  };
}

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

/**
 * Copy mutable input action sets before a state transition.
 * @param {{held: Set<string>, pressed: Set<string>}} state Input state to copy.
 * @returns {{held: Set<string>, pressed: Set<string>}} Detached input state.
 */
export function copyGameInputState(state) {
  return { held: new Set(state.held), pressed: new Set(state.pressed) };
}
