import { isValidString } from '../../../common-core.js';
import { createOptions } from '../utils/dendriteHelpers.js';
import {
  getEnvHelpers,
  cloneTemporaryDend2Data,
  appendPageAndSave,
  buildPageResponse,
} from '../browserToysCore.js';

/**
 * Validate the parsed story input.
 * @param {object} [obj] - Parsed object.
 * @param {string} obj.title - Story title.
 * @param {string} obj.content - Story content.
 * @returns {boolean} True when valid.
 */
function isValidInput(obj) {
  return Boolean(obj) && [obj.title, obj.content].every(isValidString);
}

/**
 * Safely parse a JSON string.
 * @param {string} str - String to parse.
 * @returns {object|null} Parsed object or null when invalid.
 */
function safeParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Transform and store a Dendrite story submission.
 * @param {string} input - JSON string of a Dendrite story submission.
 * @param {Map<string, Function>} env - Environment providing getData/setLocalTemporaryData.
 * @returns {string} JSON string of the new objects.
 */
export function transformDendriteStory(input, env) {
  const parsed = safeParse(input);
  if (!isValidInput(parsed)) {
    return JSON.stringify({ stories: [], pages: [], options: [] });
  }

  return createAndPersistStory(parsed, env);
}

/**
 * Persist a parsed story into the temporary DEND2 structure.
 * @param {object} parsed - Validated story object.
 * @param {Map<string, Function>} env - Environment map providing helpers.
 * @returns {string} JSON string with the newly persisted story data.
 */
function createAndPersistStory(parsed, env) {
  const { getUuid, getData, setLocalTemporaryData } = getEnvHelpers(env);

  const storyId = getUuid();
  const pageId = getUuid();
  const opts = createOptions(parsed, getUuid).map(o => ({
    ...o,
    pageId,
  }));
  const story = { id: storyId, title: parsed.title };
  const page = { id: pageId, storyId, content: parsed.content };

  const newData = cloneTemporaryDend2Data(getData);
  newData.temporary.DEND2.stories.push(story);
  appendPageAndSave(newData, page, opts, setLocalTemporaryData);

  const pageResponse = buildPageResponse(page, opts);
  const responsePayload = { ...pageResponse, stories: [story] };
  return JSON.stringify(responsePayload);
}
