// @ts-nocheck -- runtime game state is intentionally data-driven.
/** Open a dialogue sequence. */
/** @param {object} state Game state. @param {string} actorId Actor identifier. @param {string[]} lines Dialogue lines. @returns {object} Updated state. */
/* eslint-disable jsdoc/require-jsdoc, jsdoc/require-returns -- compact game-state contracts are documented at module boundaries. */
export function openDialogue(state, actorId, lines) {
  return { ...state, dialogue: { actorId, lines, index: 0, choices: [] } };
}
/** Advance or close the active dialogue sequence. */
/** @param {object} state Game state. @returns {object} Updated state. */
export function advanceDialogue(state) {
  if (!state.dialogue) return state;
  const next = state.dialogue.index + 1;
  return next >= state.dialogue.lines.length
    ? { ...state, dialogue: null }
    : { ...state, dialogue: { ...state.dialogue, index: next } };
}
/** Read the visible dialogue line. */
/** @param {object} state Game state. @returns {string|null} Current line. */
export function currentLine(state) {
  return state.dialogue ? state.dialogue.lines[state.dialogue.index] : null;
}
