// Toy: Get DEND2 Story Titles
// (input, env) -> string

import { tryOr } from '../../common.js';

/**
 * Determine if the provided value is an array of stories.
 * @param {*} value - Potential stories array.
 * @returns {value is object[]} True when value is an array.
 */
function isStoryArray(value) {
  return Array.isArray(value);
}

/**
 * Safely retrieve nested DEND2 stories.
 * @param {*} data - Application state data.
 * @returns {object[] | undefined} Possibly undefined stories array.
 */
function extractDend2Stories(data) {
  const candidate = tryOr(() => data.temporary.DEND2.stories);
  return /** @type {object[] | undefined} */ (candidate);
}

/**
 * Extract valid stories from the provided data object.
 * @param {*} data - Application state data.
 * @returns {object[]} Array of story objects.
 */
function getStories(data) {
  const stories = extractDend2Stories(data);
  if (isStoryArray(stories)) {
    return stories;
  }
  return [];
}

/**
 * Collect story titles from a DEND2 stories list.
 * @param {{ title?: string }[]} stories - List of DEND2 stories.
 * @returns {string[]} Array of story titles.
 */
function collectTitles(stories) {
  return stories
    .map(story => story.title)
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
    return JSON.stringify(gatherTitles(env));
  } catch {
    return JSON.stringify([]);
  }
}

/**
 * Retrieve story titles from the environment.
 * @param {Map<string, Function>} env - Environment with a `getData` accessor.
 * @returns {string[]} List of story titles.
 */
function gatherTitles(env) {
  const getData = env.get('getData');
  if (typeof getData !== 'function') {
    return [];
  }
  const stories = getStories(getData());
  return collectTitles(stories);
}
