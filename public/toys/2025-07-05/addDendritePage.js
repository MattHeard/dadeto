import { isValidString } from '../../../common-core.js';
import { createOptions } from '../utils/dendriteHelpers.js';
import {
  getEnvHelpers,
  cloneTemporaryDend2Data,
  appendPageAndSave,
  buildPageResponse,
} from '../browserToysCore.js';

/**
 * Validate the parsed page input.
 * @param {object} [obj] - Parsed object.
 * @param {string} obj.optionId - Option identifier.
 * @param {string} obj.content - Page content.
 * @returns {boolean} True when valid.
 */
/**
 * Check if object exists.
 * @param {object} obj Object.
 * @returns {boolean} True if exists.
 */
function doesObjectExist(obj) {
  return Boolean(obj);
}

/**
 * Check if fields are valid.
 * @param {object} obj Object.
 * @returns {boolean} True if valid.
 */
function areFieldsValid(obj) {
  return isValidString(obj.optionId) && isValidString(obj.content);
}

/**
 * Validate that the payload contains the required Dendrite page fields.
 * @param {{ optionId?: string, content?: string } | null | undefined} obj Parsed page payload.
 * @returns {boolean} True when the payload is usable.
 */
function isValidInput(obj) {
  return doesObjectExist(obj) && areFieldsValid(obj);
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
 * Persist the parsed page data into the temporary storage.
 * @param {{ optionId: string, content: string }} parsed Parsed page payload.
 * @param {Map<string, Function>} env Environment helpers used to get UUIDs and persist data.
 * @returns {string} JSON string containing the new page and option entries.
 */
function persistDendritePage(parsed, env) {
  const { getUuid, getData, setLocalTemporaryData } = getEnvHelpers(env);

  const pageId = getUuid();
  const opts = createOptions(parsed, getUuid, pageId);
  const page = {
    id: pageId,
    optionId: parsed.optionId,
    content: parsed.content,
  };

  const newData = cloneTemporaryDend2Data(getData);
  appendPageAndSave(newData, page, opts, setLocalTemporaryData);

  return JSON.stringify(buildPageResponse(page, opts));
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
  return JSON.stringify(buildPageResponse(undefined, []));
}

/**
 * Construct the JSON payload for a newly added page and its options.
 * @param {object} page The persisted page object.
 * @param {Array<object>} opts Option objects tied to the page.
 * @returns {{pages: object[], options: object[]}} Payload for the toy response.
 */
