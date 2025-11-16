import { deepClone } from './objectUtils.js';
import { isValidString } from './validation.js';
import { ensureDend2, createOptions } from '../utils/dendriteHelpers.js';

/**
 * Validate the parsed page input.
 * @param {object} [obj] - Parsed object.
 * @param {string} obj.optionId - Option identifier.
 * @param {string} obj.content - Page content.
 * @returns {boolean} True when valid.
 */
function isValidInput(obj) {
  return (
    Boolean(obj) && isValidString(obj.optionId) && isValidString(obj.content)
  );
}

/**
 * Store a Dendrite page in temporary DEND2 storage.
 * @param {string} input - JSON string representing page data.
 * @param {Map<string, Function>} env - Environment with data helpers.
 * @returns {string} JSON string of the new page and options.
 */
export function addDendritePage(input, env) {
  const parsed = safeParseJson(input);
  if (!isValidInput(parsed)) {
    return emptyResponse();
  }

  return persistDendritePage(parsed, env);
}

/**
 *
 * @param parsed
 * @param env
 */
function persistDendritePage(parsed, env) {
  const getter = env.get.bind(env);
  const getUuid = getter('getUuid');
  const getData = getter('getData');
  const setLocalTemporaryData = getter('setLocalTemporaryData');
  if (!areCallables(getUuid, getData, setLocalTemporaryData)) {
    return emptyResponse();
  }

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
}

/**
 * Parse the JSON input without throwing.
 * @param {string} input - JSON string representing the payload.
 * @returns {object|null} Parsed object or null when parsing fails.
 */
function safeParseJson(input) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

/**
 * Render a canonical empty response for the toy.
 * @returns {string} JSON string representing no pages/options.
 */
function emptyResponse() {
  return JSON.stringify({ pages: [], options: [] });
}

/**
 * Check that every argument is callable before invoking.
 * @param {...unknown} fns - Candidates for callable functions.
 * @returns {boolean} True when all arguments are functions.
 */
function areCallables(...fns) {
  return fns.every(fn => typeof fn === 'function');
}
