import { deepClone } from '../../utils/objectUtils.js';
import { isValidString } from '../../utils/validation.js';
import { ensureDend2, createOptions } from '../utils/dendriteHelpers.js';

/**
 * Validate the parsed story input.
 * @param {object} [obj] - Parsed object.
 * @param {string} obj.title - Story title.
 * @param {string} obj.content - Story content.
 * @returns {boolean} True when valid.
 */
function isValidInput(obj) {
  return Boolean(obj) && [obj.title, obj.content].every(isValidString);
}

/**
 * Safely parse a JSON string.
 * @param {string} str - String to parse.
 * @returns {object|null} Parsed object or null when invalid.
 */
function safeParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Transform and store a Dendrite story submission.
 * @param {string} input - JSON string of a Dendrite story submission.
 * @param {Map<string, Function>} env - Environment providing getData/setLocalTemporaryData.
 * @returns {string} JSON string of the new objects.
 */
export function transformDendriteStory(input, env) {
  const parsed = safeParse(input);
  if (!isValidInput(parsed)) {
    return JSON.stringify({ stories: [], pages: [], options: [] });
  }

  const getUuid = env.get('getUuid');
  const getData = env.get('getData');
  const setLocalTemporaryData = env.get('setLocalTemporaryData');
  const storyId = getUuid();
  const pageId = getUuid();
  const opts = createOptions(parsed, getUuid).map(o => ({
    ...o,
    pageId,
  }));
  const story = { id: storyId, title: parsed.title };
  const page = { id: pageId, storyId, content: parsed.content };

  const currentData = getData();
  const newData = deepClone(currentData);
  ensureDend2(newData);
  newData.temporary.DEND2.stories.push(story);
  newData.temporary.DEND2.pages.push(page);
  newData.temporary.DEND2.options.push(...opts);
  setLocalTemporaryData(newData);

  return JSON.stringify({ stories: [story], pages: [page], options: opts });
}
