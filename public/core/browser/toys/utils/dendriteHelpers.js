const DENDRITE_OPTION_KEYS = [
  'firstOption',
  'secondOption',
  'thirdOption',
  'fourthOption',
];

/**
 * Create option objects for values present in the input data.
 * @param {object} data - Source data that may contain option values.
 * @param {Function} getUuid - Function that generates unique IDs.
 * @param {string} [pageId] - Optional page identifier to include on each option.
 * @returns {Array<object>} Option list.
 */
export function createOptions(data, getUuid, pageId) {
  return DENDRITE_OPTION_KEYS.filter(key => data[key]).map(key => {
    const option = { id: getUuid(), content: data[key] };
    if (pageId) {
      option.pageId = pageId;
    }
    return option;
  });
}
