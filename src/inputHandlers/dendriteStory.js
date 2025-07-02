import { maybeRemoveElement } from './disposeHelpers.js';
import { parseJsonOrDefault } from '../utils/jsonUtils.js';

function maybeRemoveNumber(container, dom) {
  const numberInput = dom.querySelector(container, 'input[type="number"]');
  maybeRemoveElement(numberInput, container, dom);
}

function maybeRemoveKV(container, dom) {
  const kvContainer = dom.querySelector(container, '.kv-container');
  maybeRemoveElement(kvContainer, container, dom);
}

function disposeIfPossible(node) {
  if (typeof node._dispose === 'function') {
    node._dispose();
  }
}

function removeExistingForm(container, dom) {
  const existing = dom.querySelector(container, '.dendrite-form');
  if (existing) {
    disposeIfPossible(existing);
    dom.removeChild(container, existing);
  }
}

function parseDendriteData(dom, textInput) {
  const value = dom.getValue(textInput) || '{}';
  return parseJsonOrDefault(value, {});
}

function createField(dom, form, key, placeholder, data, textInput, disposers) {
  const wrapper = dom.createElement('div');
  const label = dom.createElement('label');
  dom.setTextContent(label, placeholder);

  let input;
  if (key === 'content') {
    input = dom.createElement('textarea');
  } else {
    input = dom.createElement('input');
  }
  if (key !== 'content') {
    dom.setType(input, 'text');
  }
  dom.setPlaceholder(input, placeholder);
  if (Object.prototype.hasOwnProperty.call(data, key)) {
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

export function dendriteStoryHandler(dom, container, textInput) {
  dom.hide(textInput);
  dom.disable(textInput);

  maybeRemoveNumber(container, dom);
  maybeRemoveKV(container, dom);

  removeExistingForm(container, dom);

  const form = dom.createElement('div');
  dom.setClassName(form, 'dendrite-form');
  const nextSibling = dom.getNextSibling(textInput);
  dom.insertBefore(container, form, nextSibling);

  const disposers = [];
  const data = parseDendriteData(dom, textInput);
  const fields = [
    ['title', 'Title'],
    ['content', 'Content'],
    ['firstOption', 'First option'],
    ['secondOption', 'Second option'],
    ['thirdOption', 'Third option'],
    ['fourthOption', 'Fourth option'],
  ];

  fields.forEach(([key, placeholder]) =>
    createField(dom, form, key, placeholder, data, textInput, disposers)
  );

  dom.setValue(textInput, JSON.stringify(data));

  form._dispose = () => {
    disposers.forEach(fn => fn());
  };

  return form;
}
