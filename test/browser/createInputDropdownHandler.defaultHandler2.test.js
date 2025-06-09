import { describe, it, expect, jest } from '@jest/globals';
import { createInputDropdownHandler } from '../../src/browser/toys.js';

describe('createInputDropdownHandler default fallback', () => {
  it('uses default handler for unknown select values', () => {
    const select = {};
    const container = {};
    const textInput = {};
    const event = {};

    const querySelector = jest.fn((parent, selector) => {
      if (parent === container && selector === 'input[type="text"]') {
        return textInput;
      }
      return null;
    });

    const dom = {
      getCurrentTarget: jest.fn(() => select),
      getParentElement: jest.fn(() => container),
      querySelector,
      getValue: jest.fn(() => 'unknown'),
      reveal: jest.fn(),
      enable: jest.fn(),
      hide: jest.fn(),
      disable: jest.fn(),
      removeChild: jest.fn(),
    };

    const handler = createInputDropdownHandler(dom);
    expect(() => handler(event)).not.toThrow();
    expect(dom.hide).toHaveBeenCalledWith(textInput);
    expect(dom.disable).toHaveBeenCalledWith(textInput);
    expect(dom.reveal).not.toHaveBeenCalled();
    expect(dom.enable).not.toHaveBeenCalled();
  });
});
