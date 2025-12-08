import { deepClone } from '../../objectUtils.js';
import { ensureDend2 } from './utils/dendriteHelpers.js';

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
