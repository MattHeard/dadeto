import { valueOr } from '../jsonUtils.js';
import { readStoredOrElementValue, setInputValue } from './inputValueStore.js';
import { isNonNullObject } from '../common-core.js';
import {
  DENDRITE_FORM_SELECTOR,
  KV_CONTAINER_SELECTOR,
  NUMBER_INPUT_SELECTOR,
  TEXTAREA_SELECTOR,
} from '../constants/selectors.js';
import { createDendriteHandler } from './inputHandlers/createDendriteHandler.js';
export { assertFunction as ensureFunction } from '../common-core.js';

/**
 * Iterate predicate/message pairs and return the first matching message.
 * @template T
 * @param {Array<[ (candidate: T) => boolean, string ]>} checks Predicate/message pairs.
 * @param {T} candidate Candidate value to evaluate.
 * @returns {string} Message from the first predicate that returns true or empty string.
 */
export function getFirstErrorMessage(checks, candidate) {
  const found = checks.find(([predicate]) => predicate(candidate));
  if (found) {
    return found[1];
  }

  return '';
}

/**
 * Dispose and remove a DOM element that exposes `_dispose`.
 * @param {HTMLElement | null | undefined} element Element that may expose `_dispose`.
 * @param {HTMLElement} container Parent container to clean up the element from.
 * @param {object} dom DOM helper utilities.
 * @returns {void}
 */
function removeCapturedElement(element, container, dom) {
  if (!shouldRemoveElement(element)) {
    return;
  }

  disposeCapturedElement(element);
  dom.removeChild(container, element);
}

/**
 * Determine whether the element has been instrumented for disposal.
 * @param {HTMLElement | null | undefined} element Element to inspect.
 * @returns {boolean} True when `_dispose` exists and is callable.
 */
function shouldRemoveElement(element) {
  return Boolean(element && hasDisposeHook(element));
}

/**
 * Call an element's `_dispose` hook.
 * @param {HTMLElement} element Element exposing `_dispose`.
 * @returns {void}
 */
function disposeCapturedElement(element) {
  element._dispose();
}

/**
 * Detect whether an element exposes `_dispose`.
 * @param {HTMLElement | null | undefined} element Element to inspect.
 * @returns {boolean} True when `_dispose` exists and is callable.
 */
function hasDisposeHook(element) {
  return Boolean(element && typeof element._dispose === 'function');
}

/**
 * Create a remover callback targeting the provided selector.
 * @param {string} selector Selector for the element to remove.
 * @returns {(container: HTMLElement, dom: object) => void} Cleanup callback.
 */
export function createElementRemover(selector) {
  return function removeElement(container, dom) {
    const element = dom.querySelector(container, selector);
    removeCapturedElement(element, container, dom);
  };
}

export const maybeRemoveNumber = createElementRemover(NUMBER_INPUT_SELECTOR);
export const maybeRemoveKV = createElementRemover(KV_CONTAINER_SELECTOR);
export const maybeRemoveTextarea = createElementRemover(TEXTAREA_SELECTOR);
export const maybeRemoveDendrite = createElementRemover(DENDRITE_FORM_SELECTOR);
export const BASE_CONTAINER_HANDLERS = [
  maybeRemoveKV,
  maybeRemoveDendrite,
  maybeRemoveTextarea,
];

const createContainerHandlerInvoker = (container, dom) => handler =>
  handler(container, dom);

/**
 * Invoke a set of cleanup callbacks bound to a container/dom pair.
 * @param {HTMLElement} container Element hosting the inputs.
 * @param {object} dom DOM helper utilities.
 * @param {Function[]} handlers Cleanup callbacks to run.
 */
function invokeContainerHandlers(container, dom, handlers) {
  const invoke = createContainerHandlerInvoker(container, dom);
  handlers.forEach(invoke);
}

/**
 * Apply the provided handlers for the supplied container/dom pair.
 * @param {object} options Cleanup configuration.
 * @param {HTMLElement} options.container Parent element hosting the inputs.
 * @param {object} options.dom DOM helper utilities.
 * @param {Function[]} options.baseHandlers Handlers that should always run.
 * @param {Function[]} [options.extraHandlers] Additional handlers to execute before the core stack.
 */
export function applyCleanupHandlers({
  container,
  dom,
  baseHandlers,
  extraHandlers = [],
}) {
  const handlers = [...extraHandlers, ...baseHandlers];
  invokeContainerHandlers(container, dom, handlers);
}

/**
 * Apply the shared cleanup handlers plus optional extras.
 * @param {object} options Cleanup options.
 * @param {HTMLElement} options.container Parent container for inputs.
 * @param {object} options.dom DOM helper utilities.
 * @param {Function[]} [options.extraHandlers] Additional handlers to run before the base stack.
 */
export function applyBaseCleanupHandlers({
  container,
  dom,
  extraHandlers = [],
}) {
  applyCleanupHandlers({
    container,
    dom,
    baseHandlers: BASE_CONTAINER_HANDLERS,
    extraHandlers,
  });
}

export const createGoogleSignOut = ({
  authSignOut,
  storage,
  disableAutoSelect,
}) => {
  return async () => {
    await authSignOut();
    storage.removeItem('id_token');
    disableAutoSelect();
  };
};

/**
 * Return the current Google ID token stored in session storage.
 * @param {Storage} storage - Storage object that holds the token.
 * @returns {string|null} The stored ID token, or null when unset.
 */
export function getIdToken(storage = sessionStorage) {
  return storage.getItem('id_token');
}

/**
 * Safely parse a JSON string.
 * @param {string} input - JSON string to parse.
 * @returns {{ok: boolean, message?: string, data?: object}} Parsed result.
 */
export function safeJsonParse(input) {
  try {
    return { ok: true, data: JSON.parse(input) };
  } catch (parseError) {
    return {
      ok: false,
      message: `Error: Invalid JSON input. ${parseError.message}`,
    };
  }
}

/**
 * Parses JSON or returns a provided default when parsing fails.
 * @param {string} json - JSON string to parse.
 * @param {object} [fallback] - Default value when parsing fails.
 * @returns {object} Parsed object or fallback.
 */
export function parseJsonOrDefault(json, fallback = {}) {
  const parseJsonValue = x => JSON.parse(x);
  return valueOr(safeParseJson(json, parseJsonValue), fallback);
}

/**
 * Parses a JSON string or returns `undefined` when parsing fails.
 * @param {string} json - JSON string to parse.
 * @param {Function} parseJsonValue - Parser to run on the input.
 * @returns {*} Parsed value or `undefined`.
 */
export function safeParseJson(json, parseJsonValue) {
  try {
    return parseJsonValue(json);
  } catch {
    return undefined;
  }
}

/**
 * Determine if an element exposes a dispose function.
 * @param {HTMLElement} element - The element to check.
 * @returns {boolean} True when the element has a _dispose method.
 */
export function isDisposable(element) {
  return Boolean(element) && typeof element._dispose === 'function';
}

/**
 * Call the dispose method on an element and remove it from the DOM.
 * @param {HTMLElement} element - The element to dispose.
 * @param {HTMLElement} container - Parent container element.
 * @param {object} dom - DOM helper utilities.
 * @returns {void}
 */
export function disposeAndRemove(element, container, dom) {
  element._dispose();
  dom.removeChild(container, element);
}

/**
 * Remove an element if it exposes a dispose method.
 * @param {HTMLElement} element - Element that may be disposable.
 * @param {HTMLElement} container - Parent container element.
 * @param {object} dom - DOM helper utilities.
 * @returns {void}
 */
export function maybeRemoveElement(element, container, dom) {
  if (isDisposable(element)) {
    disposeAndRemove(element, container, dom);
  }
}

const DENDRITE_OPTION_FIELDS = [
  ['content', 'Content'],
  ['firstOption', 'First option'],
  ['secondOption', 'Second option'],
  ['thirdOption', 'Third option'],
  ['fourthOption', 'Fourth option'],
];

/**
 * Build the field definitions for the dendrite page handler.
 * @returns {Array<[string, string]>} Field key/label tuples including the option ID.
 */
function getDendritePageFields() {
  return [['optionId', 'Option ID'], ...DENDRITE_OPTION_FIELDS];
}

/**
 * Build the field definitions for the dendrite story handler.
 * @returns {Array<[string, string]>} Field key/label tuples including the title.
 */
function getDendriteFields() {
  return [['title', 'Title'], ...DENDRITE_OPTION_FIELDS];
}

/**
 * Hide and disable a DOM element.
 * @param {HTMLElement} element - Element to hide.
 * @param {object} dom - DOM utilities.
 * @returns {void}
 */
export function hideAndDisable(element, dom) {
  dom.hide(element);
  dom.disable(element);
}

/**
 * Build a default handler configured with the provided cleanup callbacks.
 * @param {Array<(container: HTMLElement, dom: object) => void>} cleanupFns - Functions that clean up special widgets.
 * @returns {(dom: object, container: HTMLElement, textInput: HTMLInputElement) => void} Handler that hides the base input then runs the cleanup functions.
 */
export function createDefaultHandler(cleanupFns) {
  return function defaultHandler(dom, container, textInput) {
    hideAndDisable(textInput, dom);
    cleanupFns.forEach(fn => fn(container, dom));
  };
}

/**
 * Handle a field with no special input type by clearing related widgets.
 * @param {object} dom - DOM helper utilities.
 * @param {HTMLElement} container - Container element housing the input.
 * @param {HTMLInputElement} textInput - The text input element.
 * @returns {void}
 */
export const defaultHandler = createDefaultHandler([
  maybeRemoveNumber,
  maybeRemoveKV,
  maybeRemoveDendrite,
  maybeRemoveTextarea,
]);

export const dendritePageHandler = createDendriteHandler(
  getDendritePageFields()
);
export const dendriteStoryHandler = createDendriteHandler(getDendriteFields());

/**
 * Retrieve the stored value for an element, falling back to the element's value property.
 * @param {HTMLElement} element - Input element to look up.
 * @returns {string} The stored value or element.value when absent.
 */
export function getInputValue(element) {
  if (!element) {
    return '';
  }
  return readStoredOrElementValue(element);
}

export { setInputValue };

/**
 * Ensure that the provided value is callable.
 * @param {*} value - Candidate value.
 * @param {string} name - Name reported in the error message.
 * @returns {void}
 */
/**
 * Checks that two values are both not arrays.
 * @param {*} a - First value to inspect.
 * @param {*} b - Second value to inspect.
 * @returns {boolean} True when neither value is an array.
 */
function bothAreNotArrays(a, b) {
  return !Array.isArray(a) && !Array.isArray(b);
}

/**
 * Checks that two values are both non-null objects.
 * @param {*} a - First value to inspect.
 * @param {*} b - Second value to inspect.
 * @returns {boolean} True when both values are non-null objects.
 */
function bothAreNonNullObjects(a, b) {
  return isNonNullObject(a) && isNonNullObject(b);
}

/**
 * Determines whether two values should be merged recursively.
 * @param {*} targetValue - The destination value.
 * @param {*} sourceValue - The source value.
 * @returns {boolean} True when a deep merge should occur.
 */
function shouldDeepMerge(targetValue, sourceValue) {
  return (
    bothAreNonNullObjects(targetValue, sourceValue) &&
    bothAreNotArrays(targetValue, sourceValue)
  );
}

/**
 * Deeply merges two objects, producing a new object.
 * @param {object} target - Destination object.
 * @param {object} source - Source object to merge.
 * @returns {object} The merged object.
 */
export function deepMerge(target, source) {
  const output = { ...target };
  const mergeKey = key => {
    const targetValue = target[key];
    const sourceValue = source[key];
    if (shouldDeepMerge(targetValue, sourceValue)) {
      output[key] = deepMerge(targetValue, sourceValue);
    } else {
      output[key] = sourceValue;
    }
  };
  Object.keys(source).forEach(mergeKey);
  return output;
}

/**
 * Generates a disposer that removes an event listener.
 * @param {object} options - Parameters for the remover.
 * @param {object} options.dom - DOM helper utilities.
 * @param {EventTarget} options.el - The element to detach from.
 * @param {string} options.event - The event type to remove.
 * @param {Function} options.handler - The handler to detach.
 * @returns {Function} Disposer function removing the listener.
 */
export const createRemoveListener =
  ({ dom, el, event, handler }) =>
  () =>
    dom.removeEventListener(el, event, handler);
