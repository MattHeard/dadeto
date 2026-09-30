// @ts-nocheck -- quest state remains JSON-serializable for local saves.
/**
 * Build journal entries from authored quest data and current state.
 * @param {unknown} state - The state argument.
 * @param {unknown} content - The content argument.
 * @returns {unknown} The computed result.
 */
export function questJournal(state, content) {
  return Object.entries(content.quests).map(([id, quest]) => ({
    id,
    ...quest,
    status: state.world.flags[quest.goal]
      ? 'complete'
      : quest.requires.every(flag => state.world.flags[flag])
        ? 'active'
        : 'rumor',
  }));
}
/**
 * Update quest progress flags after a world event.
 * @param {unknown} state - The state argument.
 * @param {unknown} event - The event argument.
 * @param {unknown} value - The value argument.
 * @returns {unknown} The computed result.
 */
export function recordEvent(state, event, value = true) {
  const flags = { ...state.world.flags, [event]: value };
  if (event === 'dreamFragment')
    flags.memoryCount = (flags.memoryCount || 0) + 1;
  return {
    ...state,
    world: { ...state.world, flags },
    journal: [...new Set([...(state.journal || []), event])],
    toast: event.replaceAll('_', ' '),
  };
}
/**
 * Determine whether a quest can be revealed.
 * @param {unknown} quest - The quest argument.
 * @param {unknown} flags - The flags argument.
 * @returns {unknown} The computed result.
 */
export function questAvailable(quest, flags) {
  return quest.requires.every(flag => Boolean(flags[flag]));
}
/**
 * Resolve chapter ending from a committed player choice.
 * @param {unknown} state - The state argument.
 * @param {unknown} choice - The choice argument.
 * @param {unknown} content - The content argument.
 * @returns {unknown} The computed result.
 */
export function selectEnding(state, choice, content) {
  const ending = content.endings[choice];
  return ending
    ? {
        ...state,
        world: {
          ...state.world,
          flags: { ...state.world.flags, ending: choice, valleyAwake: true },
        },
        ending: { id: choice, text: ending },
        dialogue: null,
      }
    : state;
}
