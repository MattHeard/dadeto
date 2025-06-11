import { dendriteStoryHandler } from '../../src/inputHandlers/dendriteStory.js';
import { describe, test, expect, jest } from '@jest/globals';

describe('dendriteStoryHandler', () => {
  test('creates form, prepopulates values and updates hidden input', () => {
    const container = {};
    const textInput = { value: '{"title":"Existing"}' };
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

    const form = dendriteStoryHandler(dom, container, textInput);
    expect(dom.hide).toHaveBeenCalledWith(textInput);
    expect(dom.disable).toHaveBeenCalledWith(textInput);
    expect(dom.createElement).toHaveBeenCalledTimes(19);
    const textareaCalls = dom.createElement.mock.calls.filter(
      ([tag]) => tag === 'textarea'
    ).length;
    expect(textareaCalls).toBe(1);
    expect(dom.setType).toHaveBeenCalledTimes(5);
    dom.setType.mock.calls.forEach(([el]) => {
      expect(el.tag).toBe('input');
    });
    const firstInput = elements[3];
    expect(firstInput.value).toBe('Existing');
    firstInput.value = 'Hello';
    firstInput.handler({ target: firstInput });
    expect(textInput.value).toBe(JSON.stringify({ title: 'Hello' }));
    form._dispose();
    expect(dom.removeEventListener).toHaveBeenCalled();
  });

  test('disposes existing form', () => {
    const existing = { _dispose: jest.fn() };
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

    dendriteStoryHandler(dom, {}, {});
    expect(existing._dispose).toHaveBeenCalled();
    expect(dom.removeChild).toHaveBeenCalledWith({}, existing);
  });

  test('removes number and kv inputs', () => {
    const numberInput = { _dispose: jest.fn() };
    const kvContainer = { _dispose: jest.fn() };
    const querySelector = jest.fn((container, selector) => {
      if (selector === 'input[type="number"]') {
        return numberInput;
      }
      if (selector === '.kv-container') {
        return kvContainer;
      }
      return null;
    });
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

    dendriteStoryHandler(dom, {}, {});
    expect(numberInput._dispose).toHaveBeenCalled();
    expect(dom.removeChild).toHaveBeenCalledWith({}, numberInput);
    expect(kvContainer._dispose).toHaveBeenCalled();
    expect(dom.removeChild).toHaveBeenCalledWith({}, kvContainer);
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

  dendriteStoryHandler(dom, {}, {});
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

  const form = dendriteStoryHandler(dom, {}, textInput);
  expect(form).toBeDefined();
  expect(dom.setValue).toHaveBeenCalledWith(textInput, '{}');
});
