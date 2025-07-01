import { describe, it, expect, jest } from '@jest/globals';
import { createInputDropdownHandler } from '../../src/browser/toys.js';

// Test ensuring the dendrite-story handler branch executes correctly.
describe('createInputDropdownHandler dendrite-story', () => {
  it('sets up the dendrite form when selected', () => {
    const event = {};
    const select = {};
    const container = {};
    const textInput = {};
    const numberInput = { _dispose: jest.fn() };
    const kvContainer = { _dispose: jest.fn() };
    const formEl = {};
    const nextSibling = {};

    const dom = {
      getCurrentTarget: jest.fn(() => select),
      getParentElement: jest.fn(() => container),
      querySelector: jest.fn((el, selector) => {
        if (el === container && selector === 'input[type="text"]') {
          return textInput;
        }
        if (el === container && selector === 'input[type="number"]') {
          return numberInput;
        }
        if (el === container && selector === '.kv-container') {
          return kvContainer;
        }
        if (el === container && selector === '.dendrite-form') {
          return null;
        }
        return null;
      }),
      getValue: jest.fn(target => {
        if (target === select) {
          return 'dendrite-story';
        }
        return '';
      }),
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
    };

    const handler = createInputDropdownHandler(dom);
    handler(event);

    expect(dom.hide).toHaveBeenCalledWith(textInput);
    expect(dom.disable).toHaveBeenCalledWith(textInput);
    expect(dom.removeChild).toHaveBeenCalledWith(container, numberInput);
    expect(dom.removeChild).toHaveBeenCalledWith(container, kvContainer);
    expect(dom.createElement).toHaveBeenCalledWith('div');
    expect(dom.setClassName).toHaveBeenCalledWith(formEl, 'dendrite-form');
    expect(dom.insertBefore).toHaveBeenCalledWith(
      container,
      formEl,
      nextSibling
    );
  });
});
