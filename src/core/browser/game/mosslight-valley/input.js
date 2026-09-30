// @ts-nocheck -- runtime game state is intentionally data-driven.
/* eslint-disable jsdoc/require-param, jsdoc/require-returns -- compact game-state contracts are documented at module boundaries. */
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
});

/** Create edge-triggered input state. */
/** @returns {object} Empty input state. */
export function createInputState() {
  return { held: new Set(), pressed: new Set() };
}
/** Normalize a keyboard event into game actions. */
/** @param {object} state Input state. @param {object} event Browser event. @returns {object} Updated input state. */
export function updateInput(state, event) {
  const action = KEYS[event?.key];
  if (!action) return state;
  const next = { held: new Set(state.held), pressed: new Set(state.pressed) };
  if (event.type === 'keydown') {
    next.held.add(action);
    next.pressed.add(action);
  }
  if (event.type === 'keyup') next.held.delete(action);
  return next;
}
/** Clear one-frame actions while retaining held actions. */
/** @param {object} state Input state. @returns {object} Consumed input state. */
export function consumePressed(state) {
  return { held: new Set(state.held), pressed: new Set() };
}
/** Return the actions visible to the simulation. */
/** @param {object} state Input state. @returns {string[]} Active actions. */
export function actionsFromInput(state) {
  return [...state.held, ...state.pressed];
}
