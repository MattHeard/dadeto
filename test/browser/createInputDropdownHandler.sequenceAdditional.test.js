import { describe, test, expect, jest } from '@jest/globals';
import { createInputDropdownHandler } from '../../src/browser/toys.js';

describe('createInputDropdownHandler sequential values', () => {
  test('handles text then unknown then text again', () => {
    const select = {};
    const container = {};
    const textInput = {};
    const event = {};

    const dom = {
      getCurrentTarget: jest.fn(() => select),
      getParentElement: jest.fn(() => container),
      querySelector: jest.fn((_, selector) => {
        if (selector === 'input[type="text"]') {
          return textInput;
        }
        return null;
      }),
      getValue: jest
        .fn()
        .mockReturnValueOnce('text')
        .mockReturnValueOnce('unknown')
        .mockReturnValueOnce('text'),
      reveal: jest.fn(),
      enable: jest.fn(),
      hide: jest.fn(),
      disable: jest.fn(),
    };

    const handler = createInputDropdownHandler(dom);

    expect(() => handler(event)).not.toThrow();
    expect(dom.reveal).toHaveBeenCalledWith(textInput);
    expect(dom.enable).toHaveBeenCalledWith(textInput);

    dom.reveal.mockClear();
    dom.enable.mockClear();

    expect(() => handler(event)).not.toThrow();
    expect(dom.hide).toHaveBeenCalledWith(textInput);
    expect(dom.disable).toHaveBeenCalledWith(textInput);

    expect(() => handler(event)).not.toThrow();
    expect(dom.reveal).toHaveBeenCalledWith(textInput);
    expect(dom.enable).toHaveBeenCalledWith(textInput);
  });
});
