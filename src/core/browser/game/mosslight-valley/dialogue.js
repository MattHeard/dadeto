/** @typedef {Record<string, any> & {label?: string, set?: Record<string, boolean>, bond?: number}} DialogueChoice */
/** @typedef {{text?: string, choices?: DialogueChoice[]}} DialogueLine */
/** @typedef {{actorId: string, lines: DialogueLine[], index: number, choices: DialogueChoice[], selected?: number}} Dialogue */
/** @typedef {Record<string, any> & {dialogue?: Dialogue | null}} DialogueState */
/**
 * Start a dialogue node and preserve its choice list.
 * @param {DialogueState} state Current game state.
 * @param {string} actorId Character or event identifier.
 * @param {DialogueLine[]} node Authored dialogue lines.
 * @returns {DialogueState} State with a conversation attached.
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
 * @param {DialogueState} state Current game state.
 * @returns {DialogueState} State after continuing the conversation.
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
 * @param {DialogueState & {world: {flags: Record<string, any>, relationships: Record<string, number>}}} state Current game state.
 * @param {number} choice Choice index.
 * @returns {DialogueState} State after applying the selected choice.
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
 * @param {DialogueState} state Current game state.
 * @param {number} direction Direction to move the selection.
 * @returns {DialogueState} State with the selection updated.
 */
export function moveDialogueChoice(state, direction) {
  if (!state.dialogue?.choices?.length) return state;
  const selected = direction > 0 ? 1 : 0;
  return { ...state, dialogue: { ...state.dialogue, selected } };
}
/**
 * Return currently visible authored line.
 * @param {DialogueState} state Current game state.
 * @returns {DialogueLine | null} Currently visible line, if any.
 */
export function currentLine(state) {
  return state.dialogue?.lines[state.dialogue.index] || null;
}
