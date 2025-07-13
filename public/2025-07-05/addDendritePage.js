import { deepClone } from '../../utils/objectUtils.js';
import { isValidString } from '../../utils/validation.js';
import { ensureDend2, createOptions } from '../utils/dendriteHelpers.js';

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
    const setLocalTemporaryData = env.get('setLocalTemporaryData');
    const pageId = getUuid();
    const opts = createOptions(parsed, getUuid, pageId);
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
    setLocalTemporaryData(newData);

    return JSON.stringify({ pages: [page], options: opts });
  } catch {
    return JSON.stringify({ pages: [], options: [] });
  }
}
