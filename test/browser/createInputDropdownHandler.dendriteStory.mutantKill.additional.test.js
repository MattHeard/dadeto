import { test, expect, jest } from '@jest/globals';
import { createInputDropdownHandler } from '../../src/browser/toys.js';

test('createInputDropdownHandler dendrite-story branch initializes form and then text', () => {
  const select = {};
  const container = { insertBefore: jest.fn() };
  const textInput = {};
  const numberInput = { _dispose: jest.fn() };
  const kvContainer = { _dispose: jest.fn() };
  const formEl = {};
  const nextSibling = {};

  const dom = {
    getCurrentTarget: jest.fn(() => select),
    getParentElement: jest.fn(() => container),
    querySelector: jest.fn((el, selector) => {
      if (selector === 'input[type="text"]') {return textInput;}
      if (selector === 'input[type="number"]') {return numberInput;}
      if (selector === '.kv-container') {return kvContainer;}
      if (selector === '.dendrite-form') {return null;}
      return null;
    }),
    getValue: jest.fn(() => 'dendrite-story'),
    hide: jest.fn(),
    disable: jest.fn(),
    removeChild: jest.fn(),
    createElement: jest.fn(() => formEl),
    setClassName: jest.fn(),
    getNextSibling: jest.fn(() => nextSibling),
    insertBefore: jest.fn(),
    setTextContent: jest.fn(),
    setType: jest.fn(),
    setPlaceholder: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    setValue: jest.fn(),
    appendChild: jest.fn(),
    reveal: jest.fn(),
    enable: jest.fn(),
  };

  const handler = createInputDropdownHandler(dom);
  expect(() => handler({})).not.toThrow();
  expect(dom.setClassName).toHaveBeenCalledWith(formEl, 'dendrite-form');
  expect(dom.insertBefore).toHaveBeenCalledWith(container, formEl, nextSibling);
});
