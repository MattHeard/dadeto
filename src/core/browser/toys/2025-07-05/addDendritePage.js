import { isValidString } from '../../../common-core.js';
import {
  getEnvHelpers,
  cloneTemporaryDend2Data,
  appendPageAndSave,
  buildPageResponse,
  createOptions,
} from '../browserToysCore.js';

const ALL_REQUIRED_FIELDS = ['optionId', 'content'];

/**
 * Determine whether the payload defines every required field as a string.
 * @param {{ optionId?: string, content?: string }} obj Parsed payload.
 * @returns {boolean} True when each required field is a valid string.
 */
function areFieldsValid(obj) {
  return ALL_REQUIRED_FIELDS.every(field => isValidString(obj[field]));
}

/**
 * Validate that the parsed page payload is usable for persistence.
 * @param {{ optionId?: string, content?: string } | null | undefined} obj Candidate payload.
 * @returns {boolean} True when we can safely persist the page data.
 */
function isValidInput(obj) {
  return Boolean(obj) && areFieldsValid(obj);
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
  appendPageAndSave(newData, { page, opts, setLocalTemporaryData });

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
