import { deepClone } from '../../utils/objectUtils.js';
import { DENDRITE_OPTION_KEYS } from '../../constants/dendrite.js';

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
 * @param {object} obj - Parsed object.
 * @returns {boolean} True when valid.
 */
function isValidInput(obj) {
  return (
    obj && typeof obj.title === 'string' && typeof obj.content === 'string'
  );
}

/**
 *
 * @param data
 * @param getUuid
 */
function createOptions(data, getUuid) {
  return DENDRITE_OPTION_KEYS.filter(key => data[key]).map(key => ({
    id: getUuid(),
    content: data[key],
  }));
}

/**
 * Transform and store a Dendrite story submission.
 * @param {string} input - JSON string of a Dendrite story submission.
 * @param {Map<string, Function>} env - Environment providing getData/setData.
 * @returns {string} JSON string of the new objects.
 */
export function transformDendriteStory(input, env) {
  try {
    const parsed = JSON.parse(input);
    if (!isValidInput(parsed)) {
      throw new Error('invalid');
    }

    const getUuid = env.get('getUuid');
    const getData = env.get('getData');
    const setData = env.get('setData');
    const id = getUuid();
    const opts = createOptions(parsed, getUuid).map(o => ({
      ...o,
      pageId: id,
    }));
    const story = { id, title: parsed.title };
    const page = { id, storyId: id, content: parsed.content };

    const currentData = getData();
    const newData = deepClone(currentData);
    ensureDend2(newData);
    newData.temporary.DEND2.stories.push(story);
    newData.temporary.DEND2.pages.push(page);
    newData.temporary.DEND2.options.push(...opts);
    setData(newData);

    return JSON.stringify({ stories: [story], pages: [page], options: opts });
  } catch {
    return JSON.stringify({ stories: [], pages: [], options: [] });
  }
}
