/** @typedef {{goal: string, requires: string[], [key: string]: unknown}} QuestDefinition */
/** @typedef {{world: {flags: Record<string, any>}, journal?: string[], [key: string]: any}} QuestState */
/** @typedef {{quests: Record<string, QuestDefinition>, endings: Record<string, string>}} QuestContent */
/**
 * Build journal entries from authored quest data and current state.
 * @param {QuestState} state Current game state.
 * @param {QuestContent} content Authored quest and ending data.
 * @returns {(QuestDefinition & {id: string, status: 'complete' | 'active' | 'rumor'})[]} Quest journal entries.
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
 * @param {QuestState} state Current game state.
 * @param {string} event Event flag to record.
 * @param {boolean | number | string} [value] Value for the flag; defaults to true.
 * @returns {QuestState} Updated game state.
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
 * @param {Pick<QuestDefinition, 'requires'>} quest Quest requirement data.
 * @param {Record<string, any>} flags Current story flags.
 * @returns {boolean} Whether every prerequisite flag is set.
 */
export function questAvailable(quest, flags) {
  return quest.requires.every(flag => Boolean(flags[flag]));
}
/**
 * Resolve chapter ending from a committed player choice.
 * @param {QuestState} state Current game state.
 * @param {string} choice Ending choice identifier.
 * @param {QuestContent} content Authored ending data.
 * @returns {QuestState} State with the selected ending when it exists.
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
