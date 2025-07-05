import { deepClone } from '../../utils/objectUtils.js';
import { DENDRITE_OPTION_KEYS } from '../../constants/dendrite.js';
import { isValidString } from '../../utils/validation.js';

/**
 * Ensure the data object has a valid temporary.DEND2 structure.
 * @param {object} data - Data object to check.
 */
// eslint-disable-next-line complexity
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
 * Validate the parsed page input.
 * @param {object} [obj] - Parsed object.
 * @param {string} obj.optionId - Option identifier.
 * @param {string} obj.content - Page content.
 * @returns {boolean} True when valid.
 */
// eslint-disable-next-line complexity
function isValidInput(obj) {
  if (!obj) {
    return false;
  }
  return isValidString(obj.optionId) && isValidString(obj.content);
}

/**
 * Create option objects for values present in the input data.
 * @param {object} data - Source data that may contain option values.
 * @param {string} pageId - Identifier for the new page.
 * @param {Function} getUuid - Function that generates unique IDs.
 * @returns {Array<{id: string, pageId: string, content: string}>} Option list.
 */
function createOptions(data, pageId, getUuid) {
  return DENDRITE_OPTION_KEYS.filter(key => data[key]).map(key => ({
    id: getUuid(),
    pageId,
    content: data[key],
  }));
}

/**
 * Store a Dendrite page in temporary DEND2 storage.
 * @param {string} input - JSON string representing page data.
 * @param {Map<string, Function>} env - Environment with data helpers.
 * @returns {string} JSON string of the new page and options.
 */
// eslint-disable-next-line complexity
export function addDendritePage(input, env) {
  try {
    const parsed = JSON.parse(input);
    if (!isValidInput(parsed)) {
      throw new Error('invalid');
    }

    const getUuid = env.get('getUuid');
    const getData = env.get('getData');
    const setData = env.get('setData');
    const pageId = getUuid();
    const opts = createOptions(parsed, pageId, getUuid);
    const page = {
      id: pageId,
      optionId: parsed.optionId,
      content: parsed.content,
    };

    const currentData = getData();
    const newData = deepClone(currentData);
    ensureDend2(newData);
    newData.temporary.DEND2.pages.push(page);
    newData.temporary.DEND2.options.push(...opts);
    setData(newData);

    return JSON.stringify({ pages: [page], options: opts });
  } catch {
    return JSON.stringify({ pages: [], options: [] });
  }
}
