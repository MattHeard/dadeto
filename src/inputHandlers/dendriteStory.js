import { DENDRITE_FIELDS } from '../constants/dendrite.js';
import { maybeRemoveElement } from './disposeHelpers.js';
import { parseJsonOrDefault } from '../utils/jsonUtils.js';
import { maybeRemoveNumber, maybeRemoveKV } from './removeElements.js';
import { DENDRITE_FORM_SELECTOR } from '../constants/selectors.js';
import { hideAndDisable } from './inputState.js';

/**
 *
 * @param node
 */
function disposeIfPossible(node) {
  if (typeof node._dispose === 'function') {
    node._dispose();
  }
}

/**
 *
 * @param container
 * @param dom
 */
function removeExistingForm(container, dom) {
  const existing = dom.querySelector(container, DENDRITE_FORM_SELECTOR);
  if (existing) {
    disposeIfPossible(existing);
    dom.removeChild(container, existing);
  }
}

/**
 *
 * @param dom
 * @param textInput
 */
function parseDendriteData(dom, textInput) {
  const value = dom.getValue(textInput) || '{}';
  return parseJsonOrDefault(value, {});
}

/**
 *
 * @param dom
 * @param key
 */
function createInputElement(dom, key) {
  if (key === 'content') {
    return dom.createElement('textarea');
  }
  const element = dom.createElement('input');
  dom.setType(element, 'text');
  return element;
}

/**
 *
 * @param dom
 * @param form
 * @param root0
 * @param root0.key
 * @param root0.placeholder
 * @param root0.data
 * @param root0.textInput
 * @param root0.disposers
 */
function createField(
  dom,
  form,
  { key, placeholder, data, textInput, disposers }
) {
  const wrapper = dom.createElement('div');
  const label = dom.createElement('label');
  dom.setTextContent(label, placeholder);

  const input = createInputElement(dom, key);
  dom.setPlaceholder(input, placeholder);
  if (Object.hasOwn(data, key)) {
    dom.setValue(input, data[key]);
  }
  const onInput = () => {
    data[key] = dom.getValue(input);
    dom.setValue(textInput, JSON.stringify(data));
  };
  dom.addEventListener(input, 'input', onInput);
  disposers.push(() => dom.removeEventListener(input, 'input', onInput));
  dom.appendChild(wrapper, label);
  dom.appendChild(wrapper, input);
  dom.appendChild(form, wrapper);
}

/**
 *
 * @param dom
 * @param root0
 * @param root0.container
 * @param root0.textInput
 * @param root0.data
 * @param root0.disposers
 */
function buildForm(dom, { container, textInput, data, disposers }) {
  const form = dom.createElement('div');
  dom.setClassName(form, DENDRITE_FORM_SELECTOR.slice(1));
  const nextSibling = dom.getNextSibling(textInput);
  dom.insertBefore(container, form, nextSibling);

  DENDRITE_FIELDS.forEach(([key, placeholder]) =>
    createField(dom, form, {
      key,
      placeholder,
      data,
      textInput,
      disposers,
    })
  );

  dom.setValue(textInput, JSON.stringify(data));

  form._dispose = () => {
    disposers.forEach(fn => fn());
  };

  return form;
}

/**
 *
 * @param dom
 * @param textInput
 */
function prepareTextInput(dom, textInput) {
  hideAndDisable(textInput, dom);
}

/**
 *
 * @param dom
 * @param container
 */
function cleanContainer(dom, container) {
  maybeRemoveNumber(container, dom);
  maybeRemoveKV(container, dom);
  removeExistingForm(container, dom);
}

/**
 *
 * @param dom
 * @param container
 * @param textInput
 */
function createDendriteForm(dom, container, textInput) {
  const disposers = [];
  const data = parseDendriteData(dom, textInput);
  return buildForm(dom, { container, textInput, data, disposers });
}

/**
 *
 * @param dom
 * @param container
 * @param textInput
 */
export function dendriteStoryHandler(dom, container, textInput) {
  prepareTextInput(dom, textInput);
  cleanContainer(dom, container);
  return createDendriteForm(dom, container, textInput);
}
