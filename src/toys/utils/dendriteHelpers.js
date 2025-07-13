export { ensureDend2, createOptions };

import { DENDRITE_OPTION_KEYS } from '../../constants/dendrite.js';

/**
 * Ensure the data object has a valid temporary.DEND2 structure.
 * @param {object} data - Data object to check.
 * @returns {void}
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
 * Create option objects for values present in the input data.
 * @param {object} data - Source data that may contain option values.
 * @param {Function} getUuid - Function that generates unique IDs.
 * @param {string} [pageId] - Optional page identifier to include on each option.
 * @returns {Array<object>} Option list.
 */
function createOptions(data, getUuid, pageId) {
  return DENDRITE_OPTION_KEYS.filter(key => data[key]).map(key => ({
    id: getUuid(),
    ...(pageId ? { pageId } : {}),
    content: data[key],
  }));
}
