import { describe, test, expect, jest } from '@jest/globals';
import { blogKeyHandler } from '../../../src/core/browser/inputHandlers/blogKeyHandler.js';
import { setInputValue } from '../../../src/core/browser/browser-core.js';

/**
 * Create a mock DOM object for testing.
 * @param {object} overrides - Optional properties to override in the mock DOM.
 * @returns {object} A mock DOM object.
 */
function makeDom(overrides = {}) {
  const elements = new Map();
  let elementCounter = 0;

  const dom = {
    createElement: jest.fn(tag => {
      const el = { tag, _id: elementCounter++, _children: [], _listeners: {} };
      elements.set(el._id, el);
      return el;
    }),
    setClassName: jest.fn((el, cls) => {
      el.className = cls;
    }),
    setType: jest.fn((el, type) => {
      el.type = type;
    }),
    setPlaceholder: jest.fn((el, ph) => {
      el.placeholder = ph;
    }),
    setTextContent: jest.fn((el, text) => {
      el.textContent = text;
    }),
    setValue: jest.fn((el, val) => {
      el.value = val;
    }),
    getValue: jest.fn(el => el.value ?? ''),
    appendChild: jest.fn((parent, child) => {
      parent._children.push(child);
    }),
    removeChild: jest.fn((parent, child) => {
      parent._children = parent._children.filter(c => c !== child);
    }),
    querySelector: jest.fn(() => null),
    getNextSibling: jest.fn(() => null),
    insertBefore: jest.fn((parent, child) => {
      parent._children.push(child);
    }),
    addEventListener: jest.fn((el, event, handler) => {
      el._listeners[event] = handler;
    }),
    removeEventListener: jest.fn(),
    hide: jest.fn(),
    disable: jest.fn(),
    ...overrides,
  };

  return dom;
}

/**
 * Create a mock text input object for testing.
 * @param {string} value - The initial value of the input.
 * @returns {object} A mock text input object.
 */
function makeTextInput(value = '') {
  return { value, _inputValue: value };
}

describe('blogKeyHandler', () => {
  test('hides and disables the text input', () => {
    const dom = makeDom();
    const container = { _children: [], insertBefore: jest.fn() };
    const textInput = makeTextInput();

    blogKeyHandler(dom, container, textInput);

    expect(dom.hide).toHaveBeenCalledWith(textInput);
    expect(dom.disable).toHaveBeenCalledWith(textInput);
  });

  test('creates a form with class dendrite-form', () => {
    const dom = makeDom();
    const container = { _children: [] };
    const textInput = makeTextInput();

    blogKeyHandler(dom, container, textInput);

    expect(dom.setClassName).toHaveBeenCalledWith(
      expect.objectContaining({ tag: 'div' }),
      'dendrite-form'
    );
  });

  test('creates a title input and an existingKeys textarea', () => {
    const dom = makeDom();
    const container = { _children: [] };
    const textInput = makeTextInput();

    blogKeyHandler(dom, container, textInput);

    const inputs = dom.createElement.mock.results
      .map(r => r.value)
      .filter(el => el.tag === 'input');
    const textareas = dom.createElement.mock.results
      .map(r => r.value)
      .filter(el => el.tag === 'textarea');

    expect(inputs.length).toBeGreaterThanOrEqual(1);
    expect(textareas.length).toBeGreaterThanOrEqual(1);
  });

  test('serializes initial empty data to hidden input', () => {
    const dom = makeDom();
    const container = { _children: [] };
    const textInput = makeTextInput('');

    blogKeyHandler(dom, container, textInput);

    expect(dom.setValue).toHaveBeenCalledWith(
      textInput,
      JSON.stringify({ title: '', existingKeys: [] })
    );
  });

  test('restores existing title from hidden input', () => {
    const dom = makeDom();
    const container = { _children: [] };
    const textInput = makeTextInput();
    setInputValue(
      textInput,
      JSON.stringify({ title: 'My Post', existingKeys: [] })
    );

    blogKeyHandler(dom, container, textInput);

    const titleInput = dom.createElement.mock.results
      .map(r => r.value)
      .find(el => el.type === 'text');
    expect(dom.setValue).toHaveBeenCalledWith(titleInput, 'My Post');
  });

  test('textarea input updates existingKeys in serialized JSON', () => {
    const dom = makeDom();
    const container = { _children: [] };
    const textInput = makeTextInput('');

    blogKeyHandler(dom, container, textInput);

    const textarea = dom.createElement.mock.results
      .map(r => r.value)
      .find(el => el.tag === 'textarea');

    // Simulate user typing keys into the textarea
    textarea.value = 'GERM1\nTEXT1';
    textarea._listeners.input?.();

    expect(dom.setValue).toHaveBeenCalledWith(
      textInput,
      JSON.stringify({ title: '', existingKeys: ['GERM1', 'TEXT1'] })
    );
  });

  test('title input updates title in serialized JSON', () => {
    const dom = makeDom();
    const container = { _children: [] };
    const textInput = makeTextInput('');

    blogKeyHandler(dom, container, textInput);

    const titleInput = dom.createElement.mock.results
      .map(r => r.value)
      .find(el => el.type === 'text');

    titleInput.value = 'German Sentence Splitter';
    titleInput._listeners.input?.();

    expect(dom.setValue).toHaveBeenCalledWith(
      textInput,
      JSON.stringify({ title: 'German Sentence Splitter', existingKeys: [] })
    );
  });

  test('filters blank lines from existingKeys', () => {
    const dom = makeDom();
    const container = { _children: [] };
    const textInput = makeTextInput('');

    blogKeyHandler(dom, container, textInput);

    const textarea = dom.createElement.mock.results
      .map(r => r.value)
      .find(el => el.tag === 'textarea');

    textarea.value = 'GERM1\n\n  \nTEXT1\n';
    textarea._listeners.input?.();

    expect(dom.setValue).toHaveBeenCalledWith(
      textInput,
      JSON.stringify({ title: '', existingKeys: ['GERM1', 'TEXT1'] })
    );
  });

  test('parseLines handles null getValue result without throwing', () => {
    const dom = makeDom({ getValue: jest.fn(() => null) });
    const container = { _children: [] };
    const textInput = makeTextInput('');

    blogKeyHandler(dom, container, textInput);

    const textarea = dom.createElement.mock.results
      .map(r => r.value)
      .find(el => el.tag === 'textarea');

    textarea._listeners.input?.();

    expect(dom.setValue).toHaveBeenCalledWith(
      textInput,
      JSON.stringify({ title: '', existingKeys: [] })
    );
  });

  test('skips dispose call when existing form has no _dispose method', () => {
    const existingForm = { _children: [] }; // no _dispose
    const dom = makeDom({
      querySelector: jest.fn((_el, selector) =>
        selector === '.dendrite-form' ? existingForm : null
      ),
    });
    const container = { _children: [existingForm] };
    const textInput = makeTextInput('');

    blogKeyHandler(dom, container, textInput);

    expect(dom.removeChild).toHaveBeenCalledWith(container, existingForm);
  });

  test('removes existing dendrite form before inserting new one', () => {
    const existingForm = { _dispose: jest.fn(), _children: [] };
    const dom = makeDom({
      querySelector: jest.fn((_el, selector) =>
        selector === '.dendrite-form' ? existingForm : null
      ),
    });
    const container = { _children: [existingForm] };
    const textInput = makeTextInput('');

    blogKeyHandler(dom, container, textInput);

    expect(existingForm._dispose).toHaveBeenCalled();
    expect(dom.removeChild).toHaveBeenCalledWith(container, existingForm);
  });
});
