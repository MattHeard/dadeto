// Toy: Get DEND2 Story Titles
// (input, env) -> string

/**
 * Extract valid stories from the provided data object.
 * @param {*} data - Application state data.
 * @returns {object[]} Array of story objects.
 */
function getStories(data) {
  return Array.isArray(data?.temporary?.DEND2?.stories)
    ? data.temporary.DEND2.stories
    : [];
}

/**
 * Collect story titles from a DEND2 stories list.
 * @param {object[]} stories - List of DEND2 stories.
 * @returns {string[]} Array of story titles.
 */
function collectTitles(stories) {
  return stories
    .map(story => story?.title)
    .filter(title => typeof title === 'string');
}

/**
 * Gather titles from temporary DEND2 storage.
 * @param {*} input - Unused value.
 * @param {Map<string, Function>} env - Environment with a `getData` accessor.
 * @returns {string} JSON string of story titles.
 */
export function getDend2Titles(input, env) {
  try {
    const getData = env.get('getData');
    if (typeof getData !== 'function') {
      return JSON.stringify([]);
    }
    const stories = getStories(getData());
    return JSON.stringify(collectTitles(stories));
  } catch {
    return JSON.stringify([]);
  }
}
