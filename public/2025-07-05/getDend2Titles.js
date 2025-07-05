// Toy: Get DEND2 Story Titles
// (input, env) -> string

/**
 * Gather all DEND2 story titles from temporary storage.
 * @param {*} input - Unused value.
 * @param {Map<string, Function>} env - Environment with a `getData` accessor.
 * @returns {string} JSON array string of story titles.
 */
export function getDend2Titles(input, env) {
  const getData = env.get('getData');
  if (typeof getData !== 'function') {
    return JSON.stringify([]);
  }
  try {
    const stories = getData()?.temporary?.DEND2?.stories || [];
    const titles = stories
      .map(story => story?.title)
      .filter(title => typeof title === 'string');
    return JSON.stringify(titles);
  } catch {
    return JSON.stringify([]);
  }
}
