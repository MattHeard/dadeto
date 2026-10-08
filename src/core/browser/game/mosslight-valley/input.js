import { copyGameInputState } from '../simulationCore.js';

/** @typedef {{held: Set<string>, pressed: Set<string>}} GameInputState */

/** @type {Record<string, string>} */
const KEYS = Object.freeze({
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  a: 'a',
  b: 'b',
  x: 'x',
  y: 'y',
});

/**
 * Create edge-triggered input state.
 * @returns {GameInputState} Empty input state.
 */
export function createInputState() {
  return { held: new Set(), pressed: new Set() };
}
/**
 * Normalize a keyboard event into game actions.
 * @param {GameInputState} state Current held and pressed actions.
 * @param {{key?: string, type?: string}} event Browser key event.
 * @returns {GameInputState} Updated input state.
 */
export function updateInput(state, event) {
  const key = event?.key;
  const normalizedKey = typeof key === 'string' ? key : '';
  const action = KEYS[normalizedKey] || KEYS[normalizedKey.toLowerCase()];
  if (!action) return state;
  const next = copyGameInputState(state);
  if (event.type === 'keydown') {
    next.held.add(action);
    next.pressed.add(action);
  }
  if (event.type === 'keyup') next.held.delete(action);
  return next;
}
/**
 * Clear one-frame actions while retaining held actions.
 * @param {GameInputState} state Current input state.
 * @returns {GameInputState} Input state with pressed actions cleared.
 */
export function consumePressed(state) {
  const next = copyGameInputState(state);
  next.pressed.clear();
  return next;
}
/**
 * Return the actions visible to the simulation.
 * @param {GameInputState} state Current input state.
 * @returns {string[]} Active actions.
 */
export function actionsFromInput(state) {
  return [...new Set([...state.held, ...state.pressed])];
}

/**
 * Translate browser Gamepad API snapshots to stable game actions.
 * @param {Array<{axes?: number[], buttons?: Array<{pressed: boolean}>}|null|undefined>} gamepads Gamepad snapshots.
 * @returns {string[]} Gamepad actions for the current frame.
 */
export function gamepadActions(gamepads = []) {
  const pad = gamepads.find(Boolean);
  if (!pad) return [];
  const actions = [];
  const axes = pad.axes || [];
  const buttons = pad.buttons || [];
  if (buttons[12]?.pressed || (axes[1] || 0) < -0.55) actions.push('up');
  if (buttons[13]?.pressed || (axes[1] || 0) > 0.55) actions.push('down');
  if (buttons[14]?.pressed || (axes[0] || 0) < -0.55) actions.push('left');
  if (buttons[15]?.pressed || (axes[0] || 0) > 0.55) actions.push('right');
  if (buttons[0]?.pressed) actions.push('a');
  if (buttons[1]?.pressed) actions.push('b');
  if (buttons[2]?.pressed) actions.push('x');
  if (buttons[3]?.pressed) actions.push('y');
  return actions;
}
