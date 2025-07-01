import { describe, it, expect, jest } from '@jest/globals';
import { createInputDropdownHandler } from '../../src/browser/toys.js';

describe('createInputDropdownHandler default branch', () => {
  it('hides and disables text input when select value is unknown', () => {
    const select = {};
    const container = {};
    const textInput = {};
    const event = {};

    const getCurrentTarget = jest.fn(() => select);
    const getParentElement = jest.fn(() => container);
    const querySelector = jest.fn((_, selector) => {
      if (selector === 'input[type="text"]') {
        return textInput;
      }
      return null;
    });
    const getValue = jest.fn(() => 'unknown');
    const reveal = jest.fn();
    const enable = jest.fn();
    const hide = jest.fn();
    const disable = jest.fn();
    const removeChild = jest.fn();
    const addEventListener = jest.fn();
    const getNextSibling = jest.fn(() => null);

    const dom = {
      getCurrentTarget,
      getParentElement,
      querySelector,
      getValue,
      reveal,
      enable,
      hide,
      disable,
      removeChild,
      addEventListener,
      getNextSibling,
    };

    const handler = createInputDropdownHandler(dom);
    handler(event);

    expect(hide).toHaveBeenCalledWith(textInput);
    expect(disable).toHaveBeenCalledWith(textInput);
  });

  it('reveals and enables text input when select value is text', () => {
    const select = {};
    const container = {};
    const textInput = {};
    const event = {};

    const getCurrentTarget = jest.fn(() => select);
    const getParentElement = jest.fn(() => container);
    const querySelector = jest.fn((_, selector) => {
      if (selector === 'input[type="text"]') {
        return textInput;
      }
      return null;
    });
    const getValue = jest.fn(() => 'text');
    const reveal = jest.fn();
    const enable = jest.fn();
    const hide = jest.fn();
    const disable = jest.fn();
    const removeChild = jest.fn();
    const addEventListener = jest.fn();
    const getNextSibling = jest.fn(() => null);

    const dom = {
      getCurrentTarget,
      getParentElement,
      querySelector,
      getValue,
      reveal,
      enable,
      hide,
      disable,
      removeChild,
      addEventListener,
      getNextSibling,
    };

    const handler = createInputDropdownHandler(dom);
    expect(() => handler(event)).not.toThrow();

    expect(reveal).toHaveBeenCalledWith(textInput);
    expect(enable).toHaveBeenCalledWith(textInput);
    expect(hide).not.toHaveBeenCalled();
    expect(disable).not.toHaveBeenCalled();
  });
});
