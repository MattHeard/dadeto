// Toy: Get DEND2 Story Titles
// (input, env) -> string

/**
 * Safely access the DEND2 stories list.
 * @param {Function} getData - Function that retrieves state data.
 * @returns {object[]} Array of DEND2 story objects.
 */
function getStories(getData) {
  if (typeof getData !== 'function') {
    return [];
  }
  let data;
  try {
    data = getData();
  } catch {
    return [];
  }
  const dend2 = data && data.temporary && data.temporary.DEND2;
  const stories = dend2 && dend2.stories;
  if (Array.isArray(stories)) {
    return stories;
  }
  return [];
}

/**
 * Extract valid titles from the provided stories array.
 * @param {object[]} stories - Array of story objects.
 * @returns {string[]} Array of story titles.
 */
function extractTitles(stories) {
  return stories
    .map(story => story?.title)
    .filter(title => typeof title === 'string');
}

/**
 * Gather DEND2 story titles using the provided data getter.
 * @param {Function} getData - Function that retrieves state data.
 * @returns {string[]} Array of story titles.
 */
function gatherTitles(getData) {
  const stories = getStories(getData);
  return extractTitles(stories);
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
