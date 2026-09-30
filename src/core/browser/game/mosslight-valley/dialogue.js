// @ts-nocheck -- dialogue content is data-authored.
/**
 * Start a dialogue node and preserve its choice list.
 * @param {unknown} state - The state argument.
 * @param {unknown} actorId - The actorId argument.
 * @param {unknown} node - The node argument.
 * @returns {unknown} The computed result.
 */
export function openDialogue(state, actorId, node) {
  const lines = Array.isArray(node) ? node : node;
  return {
    ...state,
    dialogue: { actorId, lines, index: 0, choices: lines[0]?.choices || [] },
  };
}
/**
 * Advance a line, present its choices, or close the conversation.
 * @param {unknown} state - The state argument.
 * @returns {unknown} The computed result.
 */
export function advanceDialogue(state) {
  if (!state.dialogue) return state;
  const index = state.dialogue.index + 1;
  if (index >= state.dialogue.lines.length) return { ...state, dialogue: null };
  return {
    ...state,
    dialogue: {
      ...state.dialogue,
      index,
      choices: state.dialogue.lines[index]?.choices || [],
    },
  };
}
/**
 * Commit one authored dialogue choice to persistent story state.
 * @param {unknown} state - The state argument.
 * @param {unknown} choice - The choice argument.
 * @returns {unknown} The computed result.
 */
export function chooseDialogue(state, choice) {
  if (!state.dialogue?.choices?.[choice]) return state;
  const selected = state.dialogue.choices[choice];
  const flags = { ...state.world.flags, ...selected.set };
  const relationships = { ...state.world.relationships };
  if (selected.bond)
    relationships[state.dialogue.actorId] =
      (relationships[state.dialogue.actorId] || 0) + selected.bond;
  const next = {
    ...state,
    world: { ...state.world, flags, relationships },
    dialogue: null,
    toast: selected.label,
  };
  return next;
}
/**
 * Move the highlighted story choice without committing it.
 * @param {unknown} state - The state argument.
 * @param {unknown} direction - The direction argument.
 * @returns {unknown} The computed result.
 */
export function moveDialogueChoice(state, direction) {
  if (!state.dialogue?.choices?.length) return state;
  const selected = direction > 0 ? 1 : 0;
  return { ...state, dialogue: { ...state.dialogue, selected } };
}
/**
 * Return currently visible authored line.
 * @param {unknown} state - The state argument.
 * @returns {unknown} The computed result.
 */
export function currentLine(state) {
  return state.dialogue?.lines[state.dialogue.index] || null;
}
