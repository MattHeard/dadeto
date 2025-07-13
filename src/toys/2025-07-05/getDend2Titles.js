// Toy: Get DEND2 Story Titles
// (input, env) -> string

/**
 * Safely gather DEND2 story titles using the provided data getter.
 * @param {Function} getData - Function that retrieves state data.
 * @returns {string[]} Array of story titles.
 */
function gatherTitles(getData) {
  try {
    const stories = getData()?.temporary?.DEND2?.stories || [];
    return stories
      .map(story => story?.title)
      .filter(title => typeof title === 'string');
  } catch {
    return [];
  }
}

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
  const titles = gatherTitles(getData);
  return JSON.stringify(titles);
}
