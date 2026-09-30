// @ts-nocheck -- runtime game state is intentionally data-driven.
const KEYS = Object.freeze({
  ArrowUp: 'up',
  w: 'up',
  ArrowDown: 'down',
  s: 'down',
  ArrowLeft: 'left',
  a: 'left',
  ArrowRight: 'right',
  d: 'right',
  Enter: 'confirm',
  ' ': 'confirm',
  Escape: 'cancel',
  m: 'menu',
  z: 'confirm',
  x: 'cancel',
  c: 'guard',
  e: 'interact',
  f: 'farm',
  q: 'fish',
  r: 'rest',
  j: 'journal',
  v: 'special',
  t: 'wait',
});

/**
 * Create edge-triggered input state.
 * @returns {object} Empty input state.
 */
export function createInputState() {
  return { held: new Set(), pressed: new Set() };
}
/**
 * Normalize a keyboard event into game actions.
 * @param {object} state - Current held and pressed actions.
 * @param {object} event - Browser key event.
 * @returns {object} Updated input state.
 */
export function updateInput(state, event) {
  const action = KEYS[event?.key];
  if (!action) return state;
  const next = copyInputState(state);
  if (event.type === 'keydown') {
    next.held.add(action);
    next.pressed.add(action);
  }
  if (event.type === 'keyup') next.held.delete(action);
  return next;
}
/**
 * Clear one-frame actions while retaining held actions.
 * @param {object} state - Current input state.
 * @returns {object} Input state with pressed actions cleared.
 */
export function consumePressed(state) {
  return { ...copyInputState(state), pressed: new Set() };
}

/**
 * Copy both mutable action sets before an input-state transition.
 * @param {object} state - Input state to copy.
 * @returns {object} A detached input-state copy.
 */
function copyInputState(state) {
  return { held: new Set(state.held), pressed: new Set(state.pressed) };
}
/**
 * Return the actions visible to the simulation.
 * @param {object} state - Current input state.
 * @returns {string[]} Active actions.
 */
export function actionsFromInput(state) {
  return [...new Set([...state.held, ...state.pressed])];
}

/**
 * Translate browser Gamepad API snapshots to stable game actions.
 * @param {unknown} gamepads - The gamepads input.
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
  if (buttons[0]?.pressed) actions.push('confirm', 'interact');
  if (buttons[1]?.pressed) actions.push('guard');
  if (buttons[2]?.pressed) actions.push('special');
  if (buttons[9]?.pressed) actions.push('journal');
  return actions;
}
