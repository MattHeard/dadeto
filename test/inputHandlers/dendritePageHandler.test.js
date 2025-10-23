import { dendritePageHandler } from '../../src/core/inputHandlers/dendritePage.js';
import { describe, test, expect, jest } from '@jest/globals';

describe('dendritePageHandler', () => {
  test('creates form, prepopulates values and updates hidden input', () => {
    const container = {};
    const textInput = { value: '{"optionId":"Existing"}' };
    const elements = [];
    let createCount = 0;
    const dom = {
      hide: jest.fn(),
      disable: jest.fn(),
      querySelector: jest.fn(() => null),
      removeChild: jest.fn(),
      createElement: jest.fn(tag => {
        const el = { id: createCount++, tag };
        elements.push(el);
        return el;
      }),
      setClassName: jest.fn(),
      getNextSibling: jest.fn(() => ({})),
      insertBefore: jest.fn(),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setTextContent: jest.fn(),
      addEventListener: jest.fn((el, _evt, handler) => {
        el.handler = handler;
      }),
      removeEventListener: jest.fn(),
      appendChild: jest.fn(),
      getValue: jest.fn(el => el.value),
      setValue: jest.fn((el, val) => {
        el.value = val;
      }),
    };

    const form = dendritePageHandler(dom, container, textInput);
    expect(dom.createElement.mock.calls[0][0]).toBe('div');
    expect(dom.querySelector).toHaveBeenCalledWith(container, '.dendrite-form');
    expect(dom.hide).toHaveBeenCalledWith(textInput);
    expect(dom.disable).toHaveBeenCalledWith(textInput);
    expect(dom.querySelector).toHaveBeenCalledWith(container, '.dendrite-form');
    expect(dom.createElement).toHaveBeenCalledTimes(19);
    const [firstCallTag] = dom.createElement.mock.calls[0];
    expect(firstCallTag).toBe('div');
    const textareaCalls = dom.createElement.mock.calls.filter(
      ([tag]) => tag === 'textarea'
    ).length;
    expect(textareaCalls).toBe(1);
    const divCalls = dom.createElement.mock.calls.filter(
      ([tag]) => tag === 'div'
    ).length;
    expect(divCalls).toBe(7);
    expect(dom.setType).toHaveBeenCalledTimes(5);
    dom.setType.mock.calls.forEach(([el, type]) => {
      expect(el.tag).toBe('input');
      expect(type).toBe('text');
    });
    const firstInput = elements[3];
    expect(firstInput.value).toBe('Existing');
    firstInput.value = 'Hello';
    firstInput.handler({ target: firstInput });
    expect(textInput.value).toBe(JSON.stringify({ optionId: 'Hello' }));
    form._dispose();
    expect(dom.removeEventListener).toHaveBeenCalled();
  });

  test('disposes existing form', () => {
    const existing = { _dispose: jest.fn() };
    const dom = {
      hide: jest.fn(),
      disable: jest.fn(),
      querySelector: jest.fn((container, selector) => {
        if (selector === '.dendrite-form') {
          return existing;
        }
        return null;
      }),
      removeChild: jest.fn(),
      createElement: jest.fn(() => ({})),
      setClassName: jest.fn(),
      getNextSibling: jest.fn(() => ({})),
      insertBefore: jest.fn(),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      appendChild: jest.fn(),
      getValue: jest.fn(el => el.value),
      setValue: jest.fn(),
    };

    dendritePageHandler(dom, {}, {});
    expect(existing._dispose).toHaveBeenCalledTimes(1);
    expect(dom.removeChild).toHaveBeenCalledWith({}, existing);
  });

  test('queries for an existing dendrite form', () => {
    const dom = {
      hide: jest.fn(),
      disable: jest.fn(),
      querySelector: jest.fn(() => null),
      removeChild: jest.fn(),
      createElement: jest.fn(() => ({})),
      setClassName: jest.fn(),
      getNextSibling: jest.fn(() => ({})),
      insertBefore: jest.fn(),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      appendChild: jest.fn(),
      getValue: jest.fn(() => '{}'),
      setValue: jest.fn(),
    };

    const container = {};
    dendritePageHandler(dom, container, {});
    expect(dom.querySelector).toHaveBeenCalledWith(container, '.dendrite-form');
  });

  test('removes number and kv inputs', () => {
    const numberInput = { _dispose: jest.fn() };
    const kvContainer = { _dispose: jest.fn() };
    const textarea = { _dispose: jest.fn() };
    const selectorMap = {
      'input[type="number"]': numberInput,
      '.kv-container': kvContainer,
      '.toy-textarea': textarea,
    };
    const querySelector = jest.fn(
      (_, selector) => selectorMap[selector] ?? null
    );
    const dom = {
      hide: jest.fn(),
      disable: jest.fn(),
      querySelector,
      removeChild: jest.fn(),
      createElement: jest.fn(() => ({})),
      setClassName: jest.fn(),
      getNextSibling: jest.fn(() => ({})),
      insertBefore: jest.fn(),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      appendChild: jest.fn(),
      getValue: jest.fn(() => '{}'),
      setValue: jest.fn(),
    };

    dendritePageHandler(dom, {}, {});
    expect(numberInput._dispose).toHaveBeenCalled();
    expect(dom.removeChild).toHaveBeenCalledWith({}, numberInput);
    expect(kvContainer._dispose).toHaveBeenCalled();
    expect(dom.removeChild).toHaveBeenCalledWith({}, kvContainer);
    expect(textarea._dispose).toHaveBeenCalled();
    expect(dom.removeChild).toHaveBeenCalledWith({}, textarea);
  });
});

test('removes existing form without dispose method', () => {
  const existing = {};
  const dom = {
    hide: jest.fn(),
    disable: jest.fn(),
    querySelector: jest.fn(() => existing),
    removeChild: jest.fn(),
    createElement: jest.fn(() => ({})),
    setClassName: jest.fn(),
    getNextSibling: jest.fn(() => ({})),
    insertBefore: jest.fn(),
    setType: jest.fn(),
    setPlaceholder: jest.fn(),
    setTextContent: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(),
    getValue: jest.fn(el => el.value),
    setValue: jest.fn(),
  };

  dendritePageHandler(dom, {}, {});
  expect(dom.removeChild).toHaveBeenCalledWith({}, existing);
});

test('handles invalid JSON input', () => {
  const textInput = { value: '{invalid}' };
  const dom = {
    hide: jest.fn(),
    disable: jest.fn(),
    querySelector: jest.fn(() => null),
    removeChild: jest.fn(),
    createElement: jest.fn(() => ({})),
    setClassName: jest.fn(),
    getNextSibling: jest.fn(() => ({})),
    insertBefore: jest.fn(),
    setType: jest.fn(),
    setPlaceholder: jest.fn(),
    setTextContent: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(),
    getValue: jest.fn(el => el.value),
    setValue: jest.fn(),
  };

  const form = dendritePageHandler(dom, {}, textInput);
  expect(form).toBeDefined();
  expect(dom.setValue).toHaveBeenCalledWith(textInput, '{}');
});

test('sets expected placeholders and label text', () => {
  const dom = {
    hide: jest.fn(),
    disable: jest.fn(),
    querySelector: jest.fn(() => null),
    removeChild: jest.fn(),
    createElement: jest.fn(() => ({})),
    setClassName: jest.fn(),
    getNextSibling: jest.fn(() => ({})),
    insertBefore: jest.fn(),
    setType: jest.fn(),
    setPlaceholder: jest.fn(),
    setTextContent: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(),
    getValue: jest.fn(() => '{}'),
    setValue: jest.fn(),
  };

  dendritePageHandler(dom, {}, { value: '{}' });

  const expected = [
    'Option ID',
    'Content',
    'First option',
    'Second option',
    'Third option',
    'Fourth option',
  ];

  const placeholders = dom.setPlaceholder.mock.calls.map(call => call[1]);
  const labels = dom.setTextContent.mock.calls.map(call => call[1]);
  expect(placeholders).toEqual(expected);
  expect(labels).toEqual(expected);
});

test('creates a label element for each field', () => {
  const dom = {
    hide: jest.fn(),
    disable: jest.fn(),
    querySelector: jest.fn(() => null),
    removeChild: jest.fn(),
    createElement: jest.fn(() => ({})),
    setClassName: jest.fn(),
    getNextSibling: jest.fn(() => ({})),
    insertBefore: jest.fn(),
    setType: jest.fn(),
    setPlaceholder: jest.fn(),
    setTextContent: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(),
    getValue: jest.fn(() => '{}'),
    setValue: jest.fn(),
  };

  dendritePageHandler(dom, {}, { value: '{}' });

  const labelCalls = dom.createElement.mock.calls.filter(
    ([tag]) => tag === 'label'
  );
  expect(labelCalls).toHaveLength(6);
});

test('does not set input values when data is missing', () => {
  const container = {};
  const textInput = { value: '{}' };
  const dom = {
    hide: jest.fn(),
    disable: jest.fn(),
    querySelector: jest.fn(() => null),
    removeChild: jest.fn(),
    createElement: jest.fn(() => ({})),
    setClassName: jest.fn(),
    getNextSibling: jest.fn(() => ({})),
    insertBefore: jest.fn(),
    setType: jest.fn(),
    setPlaceholder: jest.fn(),
    setTextContent: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(),
    getValue: jest.fn(el => el.value),
    setValue: jest.fn((el, val) => {
      el.value = val;
    }),
  };

  dendritePageHandler(dom, container, textInput);

  expect(dom.setValue.mock.calls).toHaveLength(1);
  expect(dom.setValue).toHaveBeenCalledWith(textInput, '{}');
});

test('adds input listeners and disposers remove them', () => {
  const container = {};
  const textInput = { value: '{}' };
  const dom = {
    hide: jest.fn(),
    disable: jest.fn(),
    querySelector: jest.fn(() => null),
    removeChild: jest.fn(),
    createElement: jest.fn(() => ({})),
    setClassName: jest.fn(),
    getNextSibling: jest.fn(() => ({})),
    insertBefore: jest.fn(),
    setType: jest.fn(),
    setPlaceholder: jest.fn(),
    setTextContent: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(),
    getValue: jest.fn(el => el.value),
    setValue: jest.fn(),
  };

  const form = dendritePageHandler(dom, container, textInput);

  expect(dom.addEventListener).toHaveBeenCalled();
  dom.addEventListener.mock.calls.forEach(([, evt]) => {
    expect(evt).toBe('input');
  });

  form._dispose();
  dom.removeEventListener.mock.calls.forEach(([, evt]) => {
    expect(evt).toBe('input');
  });
});
