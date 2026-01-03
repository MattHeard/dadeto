import { deepClone, safeParseJson, valueOr } from '../browser-core.js';
import { isNonNullObject, isValidString } from '../../commonCore.js';

/**
 * @typedef {( ...args: any[]) => any} EnvHelperFunc
 * @typedef {Map<string, EnvHelperFunc>} ToyEnv
 * @typedef {{ stories: object[], pages: object[], options: object[] }} Dend2Data
 * @typedef {{ temporary?: { DEND2?: Dend2Data } }} ToyStorage
 * @typedef {{ id: string, optionId: string, content: string }} ToyPage
 * @typedef {{ id: string, title: string }} ToyStory
 * @typedef {{ id: string, content: string, pageId?: string }} ToyOption
 * @typedef {{ getUuid: () => string, getData: () => ToyStorage, setLocalTemporaryData: (data: ToyStorage) => void }} EnvAccessors
 */

/**
 *
 * @param env
 * @param key
 */
function requireEnvHelper(env, key) {
  const helper = env.get(key);
  if (typeof helper !== 'function') {
    throw new Error(`Missing toy helper "${key}"`);
  }
  return helper;
}

/**
 * Run a callback when the input value is a string.
 * @param {unknown} value Candidate value.
 * @param {(value: string) => T} fn Callback that consumes the string.
 * @returns {T | null} Result of the callback or null when the input is not a string.
 * @template T
 */
export { whenString } from '../../commonCore.js';

/**
 * Helper utilities shared by browser toys.
 * @param {ToyEnv} env Environment map that exposes helpers.
 * @returns {EnvAccessors} Accessors.
 */
export function getEnvHelpers(env) {
  return {
    getUuid: /** @type {() => string} */ (requireEnvHelper(env, 'getUuid')),
    getData: /** @type {() => ToyStorage} */ (requireEnvHelper(env, 'getData')),
    setLocalTemporaryData: /** @type {(data: ToyStorage) => void} */ (
      requireEnvHelper(env, 'setLocalTemporaryData')
    ),
  };
}

/**
 * Parses a JSON string and falls back to a default when parsing fails.
 * @param {string} json - JSON string to parse.
 * @param {object|null} [fallback] - Value to return when parsing fails.
 * @returns {object|null} Parsed object or the fallback.
 */
export function parseJsonOrFallback(json, fallback = null) {
  return valueOr(safeParseJson(json, JSON.parse), fallback);
}

/**
 * Run a toy with parsed JSON input and return the handler result string.
 * @param {string} input - JSON payload string.
 * @param {(parsed: object) => string} handler - Handler that runs the toy logic.
 * @returns {string} Result string or `'{}'` on parse failure.
 */
export function runToyWithParsedJson(input, handler) {
  try {
    const parsed = JSON.parse(input);
    return handler(parsed);
  } catch {
    return JSON.stringify({});
  }
}

/**
 * Check whether a value is a plain object.
 * @param {*} value - Value to inspect.
 * @returns {boolean} True when the value is a non-array object.
 */
export function isPlainObject(value) {
  return Boolean(value) && value.constructor === Object;
}

const DENDRITE_TEMP_KEYS = ['stories', 'pages', 'options'];
export const DENDRITE_OPTION_KEYS = [
  'firstOption',
  'secondOption',
  'thirdOption',
  'fourthOption',
];

/**
 * Build an empty DEND2 container initialized for the toy state.
 * @returns {{stories: object[], pages: object[], options: object[]}} Empty DEND2.
 */
function createEmptyDend2() {
  return { stories: [], pages: [], options: [] };
}

/**
 * Verify that the requested properties exist as arrays.
 * @param {Record<string, unknown>} obj Object to validate.
 * @param {string[]} keys Array keys that must resolve to arrays.
 * @returns {boolean} True when every key points to an array.
 */
function hasArrayProps(obj, keys) {
  return keys.every(key => Array.isArray(obj[key]));
}

/**
 * Determine whether the given data matches the DEND2 shape.
 * @param {Record<string, unknown>} obj Candidate structure.
 * @returns {boolean} True when the shape is valid.
 */
function isValidDend2Structure(obj) {
  return isNonNullObject(obj) && hasArrayProps(obj, DENDRITE_TEMP_KEYS);
}

/**
 * Confirm that the temporary storage contains a DEND2 payload.
 * @param {ToyStorage} data Storage object that should include `temporary`.
 * @returns {boolean} True when `temporary.DEND2` is valid.
 */
function isTemporaryValid(data) {
  if (!isNonNullObject(data.temporary)) {
    return false;
  }
  return isValidDend2Structure(data.temporary.DEND2);
}

/**
 * Make certain the store exposes a valid `temporary.DEND2` bucket.
 * @param {ToyStorage} data Storage object to update.
 * @returns {void}
 */
export function ensureDend2(data) {
  if (!isTemporaryValid(data)) {
    data.temporary = { DEND2: createEmptyDend2() };
  }
}

/**
 * Create option objects for values present in the input data.
 * @param {Record<string, unknown>} data Source that may contain option values.
 * @param {() => string} getUuid UUID generator.
 * @param {string} [pageId] Optional page identifier to include on each option.
 * @returns {ToyOption[]} Option list.
 */
export function createOptions(data, getUuid, pageId) {
  return DENDRITE_OPTION_KEYS.reduce((acc, key) => {
    const candidate = data[key];
    if (typeof candidate !== 'string' || candidate.length === 0) {
      return acc;
    }
    /** @type {ToyOption} */
    const option = { id: getUuid(), content: candidate };
    if (pageId) {
      option.pageId = pageId;
    }
    acc.push(option);
    return acc;
  }, /** @type {ToyOption[]} */ ([]));
}

/**
 * Clone the current data snapshot and guarantee a temporary DEND2 structure.
 * @param {() => ToyStorage} getData Function that returns the current storage object.
 * @returns {ToyStorage} Clone of the current data with a ready `temporary.DEND2`.
 */
export function cloneTemporaryDend2Data(getData) {
  const currentData = getData();
  const newData = /** @type {ToyStorage} */ (deepClone(currentData));
  ensureDend2(newData);
  return newData;
}

/**
 * Append a newly created page and its options to the cloned DEND2 state.
 * @param {ToyStorage} data Cloned storage object with `temporary.DEND2`.
 * @param {ToyPage} page Page object to persist.
 * @param {ToyOption[]} opts Option objects to attach.
 * @returns {ToyStorage} The updated storage object.
 */
export function appendPageAndOptions(data, page, opts) {
  data.temporary.DEND2.pages.push(page);
  data.temporary.DEND2.options.push(...opts);
  return data;
}

/**
 * Append the page/options and persist the updated storage back.
 * @param {ToyStorage} data Cloned DEND2 storage instance.
 * @param {{page: ToyPage, opts: ToyOption[], setLocalTemporaryData: (data: ToyStorage) => void}} params Payload metadata and writer.
 * @returns {void}
 */
export function appendPageAndSave(data, { page, opts, setLocalTemporaryData }) {
  appendPageAndOptions(data, page, opts);
  setLocalTemporaryData(data);
}

/**
 * Construct the JSON payload for a newly added page and its options.
 * @param {ToyPage | undefined} page The persisted page object.
 * @param {ToyOption[]} opts Option objects tied to the page.
 * @returns {{pages: ToyPage[], options: ToyOption[]}} Payload for the toy response.
 */
export function buildPageResponse(page, opts) {
  const pages = [];
  if (page) {
    pages.push(page);
  }
  return { pages, options: opts };
}

const PAGE_REQUIRED_FIELDS = ['optionId', 'content'];
const EMPTY_STORY_RESPONSE = JSON.stringify({
  stories: [],
  pages: [],
  options: [],
});

/**
 * Determine whether the parsed story payload defines the required fields.
 * @param {{ title?: string, content?: string } | null | undefined} parsed Payload to validate.
 * @returns {boolean} True when both title and content are valid strings.
 */
export function isValidStoryInput(parsed) {
  return Boolean(parsed) && [parsed.title, parsed.content].every(isValidString);
}

/**
 * Determine whether the parsed page payload defines the required fields.
 * @param {{ optionId?: string, content?: string } | null | undefined} parsed Payload to validate.
 * @returns {boolean} True when each required field is a valid string.
 */
export function isValidPageInput(parsed) {
  return (
    Boolean(parsed) &&
    PAGE_REQUIRED_FIELDS.every(field => isValidString(parsed[field]))
  );
}

/**
 * Build the canonical empty page response when no data can be persisted.
 * @returns {string} JSON string representing no pages/options.
 */
export function buildEmptyDendritePageResponse() {
  return JSON.stringify(buildPageResponse(undefined, []));
}

/**
 * Build the canonical empty story response when no data can be persisted.
 * @returns {string} JSON string representing no stories/pages/options.
 */
export function buildEmptyDendriteStoryResponse() {
  return EMPTY_STORY_RESPONSE;
}

/**
 * Clone the temporary DEND2 store, mutate it if needed, and persist the supplied page/option data.
 * @param {ToyEnv} env Environment helpers used during persistence.
 * @param {{ page: ToyPage, options: ToyOption[] }} payload Page metadata to persist.
 * @param {(data: ToyStorage) => void} [mutateData] Optional hook to mutate the cloned data before saving.
 * @returns {ToyStorage} Updated temporary data after the persistence step.
 */
function persistTemporaryData(env, payload, mutateData = () => {}) {
  const { page, options } = payload;
  const { getData, setLocalTemporaryData } = getEnvHelpers(env);
  const newData = cloneTemporaryDend2Data(getData);
  mutateData(newData);
  appendPageAndSave(newData, { page, opts: options, setLocalTemporaryData });
  return newData;
}

/**
 * Build the JSON response for a persisted page payload.
 * @param {{ page: ToyPage, options: ToyOption[] }} payload Page metadata mirrored in the response.
 * @param {ToyStorage} newData Cloned temporary data that may have been mutated.
 * @param {(context: { newData: ToyStorage, page: ToyPage, options: ToyOption[] }) => object} [extraResponse] Optional fields to merge into the response.
 * @returns {string} JSON string representing the persisted page data.
 */
function buildPersistedResponse(payload, newData, extraResponse = () => ({})) {
  const { page, options } = payload;
  const response = buildPageResponse(page, options);
  return JSON.stringify({
    ...response,
    ...extraResponse({ newData, page, options }),
  });
}

/**
 * Persist a Dendrite page payload into temporary storage.
 * @param {{ optionId: string, content: string }} parsed Parsed page payload.
 * @param {ToyEnv} env Environment helpers used to get UUIDs and persist data.
 * @returns {string} JSON string containing the new page and option entries.
 */
export function persistDendritePage(parsed, env) {
  const { getUuid } = getEnvHelpers(env);
  const pageId = getUuid();
  const opts = createOptions(parsed, getUuid, pageId);
  const page = {
    id: pageId,
    optionId: parsed.optionId,
    content: parsed.content,
  };

  const newData = persistTemporaryData(env, { page, options: opts });
  return buildPersistedResponse({ page, options: opts }, newData);
}

/**
 * Persist a Dendrite story payload into temporary storage.
 * @param {{ title: string, content: string }} parsed Parsed story payload.
 * @param {ToyEnv} env Environment with helpers for persistence.
 * @returns {string} JSON string containing the newly persisted story data.
 */
export function persistDendriteStory(parsed, env) {
  const { getUuid } = getEnvHelpers(env);
  const storyId = getUuid();
  const pageId = getUuid();
  const page = {
    id: pageId,
    storyId,
    content: parsed.content,
  };
  const story = { id: storyId, title: parsed.title };
  const opts = createOptions(parsed, getUuid).map(option => ({
    ...option,
    pageId,
  }));

  const newData = persistTemporaryData(env, { page, options: opts }, newData =>
    newData.temporary.DEND2.stories.push(story)
  );

  return buildPersistedResponse({ page, options: opts }, newData, () => ({
    stories: [story],
  }));
}
