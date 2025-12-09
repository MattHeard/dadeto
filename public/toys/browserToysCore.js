import { deepClone } from '../../objectUtils.js';
import { isNonNullObject } from '../browser-core.js';

/**
 * Helper utilities shared by browser toys.
 * @param {Map<string, Function>} env Environment map that exposes helpers.
 * @returns {{getUuid: Function, getData: Function, setLocalTemporaryData: Function}} Accessors.
 */
export function getEnvHelpers(env) {
  const getter = env.get.bind(env);
  return {
    getUuid: getter('getUuid'),
    getData: getter('getData'),
    setLocalTemporaryData: getter('setLocalTemporaryData'),
  };
}

const DENDRITE_TEMP_KEYS = ['stories', 'pages', 'options'];
const DENDRITE_OPTION_KEYS = [
  'firstOption',
  'secondOption',
  'thirdOption',
  'fourthOption',
];

/**
 *
 */
function createEmptyDend2() {
  return { stories: [], pages: [], options: [] };
}

/**
 *
 * @param obj
 * @param keys
 */
function hasArrayProps(obj, keys) {
  return keys.every(key => Array.isArray(obj[key]));
}

/**
 *
 * @param obj
 */
function isValidDend2Structure(obj) {
  return isNonNullObject(obj) && hasArrayProps(obj, DENDRITE_TEMP_KEYS);
}

/**
 *
 * @param data
 */
function isTemporaryValid(data) {
  if (!isNonNullObject(data.temporary)) {
    return false;
  }
  return isValidDend2Structure(data.temporary.DEND2);
}

/**
 *
 * @param data
 */
export function ensureDend2(data) {
  if (!isTemporaryValid(data)) {
    data.temporary = { DEND2: createEmptyDend2() };
  }
}

/**
 * Create option objects for values present in the input data.
 * @param {object} data Source that may contain option values.
 * @param {Function} getUuid UUID generator.
 * @param {string} [pageId] Optional page identifier to include on each option.
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

/**
 * Clone the current data snapshot and guarantee a temporary DEND2 structure.
 * @param {Function} getData Function that returns the current storage object.
 * @returns {object} Clone of the current data with a ready `temporary.DEND2`.
 */
export function cloneTemporaryDend2Data(getData) {
  const currentData = getData();
  const newData = deepClone(currentData);
  ensureDend2(newData);
  return newData;
}

/**
 * Append a newly created page and its options to the cloned DEND2 state.
 * @param {object} data Cloned storage object with `temporary.DEND2`.
 * @param {object} page Page object to persist.
 * @param {Array<object>} opts Option objects to attach.
 * @returns {object} The updated storage object.
 */
export function appendPageAndOptions(data, page, opts) {
  data.temporary.DEND2.pages.push(page);
  data.temporary.DEND2.options.push(...opts);
  return data;
}

/**
 * Append the page/options and persist the updated storage back.
 * @param {object} data Cloned DEND2 storage instance.
 * @param {object} page Page entity to add.
 * @param {Array<object>} opts Options to add.
 * @param {Function} setLocalTemporaryData Function used to persist the mutated data.
 * @returns {void}
 */
export function appendPageAndSave(data, page, opts, setLocalTemporaryData) {
  appendPageAndOptions(data, page, opts);
  setLocalTemporaryData(data);
}

/**
 * Construct the JSON payload for a newly added page and its options.
 * @param {object} page The persisted page object.
 * @param {Array<object>} opts Option objects tied to the page.
 * @returns {{pages: object[], options: object[]}} Payload for the toy response.
 */
export function buildPageResponse(page, opts) {
  return { pages: page ? [page] : [], options: opts };
}
