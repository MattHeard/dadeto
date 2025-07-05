// Toy: Get DEND2 Story Titles
// (input, env) -> string

/**
 * Gather all DEND2 story titles from temporary storage.
 * @param {*} input - Unused value.
 * @param {Map<string, Function>} env - Environment with a `getData` accessor.
 * @returns {string} JSON array string of story titles.
 */
export function getDend2Titles(input, env) {
  try {
    const getData = env.get('getData');
    const data = getData();
    const stories = data?.temporary?.DEND2?.stories;
    if (!Array.isArray(stories)) {
      return JSON.stringify([]);
    }
    const titles = stories
      .map(story => story?.title)
      .filter(title => typeof title === 'string');
    return JSON.stringify(titles);
  } catch {
    return JSON.stringify([]);
  }
}
