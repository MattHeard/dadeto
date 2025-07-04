import { deepClone } from '../../utils/objectUtils.js';
import { DENDRITE_OPTION_KEYS } from '../../constants/dendrite.js';
import { isValidString } from '../../utils/validation.js';

/**
 * Ensure the data object has a valid temporary.DEND2 structure.
 * @param {object} data - Data object to check.
 */
function ensureDend2(data) {
  if (typeof data.temporary !== 'object' || data.temporary === null) {
    data.temporary = { DEND2: { stories: [], pages: [], options: [] } };
    return;
  }
  const t = data.temporary;
  if (
    typeof t.DEND2 !== 'object' ||
    t.DEND2 === null ||
    !Array.isArray(t.DEND2.stories) ||
    !Array.isArray(t.DEND2.pages) ||
    !Array.isArray(t.DEND2.options)
  ) {
    t.DEND2 = { stories: [], pages: [], options: [] };
  }
}

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
 * Create option objects for values present in the input data.
 * @param {object} data - Source data that may contain option values.
 * @param {Function} getUuid - Function that generates unique IDs.
 * @returns {Array<{id: string, content: string}>} Array of option objects.
 */
function createOptions(data, getUuid) {
  return DENDRITE_OPTION_KEYS.filter(key => data[key]).map(key => ({
    id: getUuid(),
    content: data[key],
  }));
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
