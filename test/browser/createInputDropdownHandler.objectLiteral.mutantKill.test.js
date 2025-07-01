import { describe, it, expect, jest } from '@jest/globals';
import { createInputDropdownHandler } from '../../src/browser/toys.js';

describe('createInputDropdownHandler object literal mutant killer', () => {
  it('handles known select values without throwing', () => {
    const select = {};
    const container = {};
    const textInput = {};
    const event = {};
    const numberInput = { _dispose: jest.fn() };
    const kvContainer = { _dispose: jest.fn() };
    const dom = {
      getCurrentTarget: jest.fn(() => select),
      getParentElement: jest.fn(() => container),
      querySelector: jest.fn((_, selector) => {
        const elements = {
          'input[type="text"]': textInput,
          'input[type="number"]': numberInput,
          '.kv-container': kvContainer,
        };
        return elements[selector] ?? null;
      }),
      getValue: jest.fn(() => 'text'),
      reveal: jest.fn(),
      enable: jest.fn(),
      hide: jest.fn(),
      disable: jest.fn(),
      removeChild: jest.fn(),
    };

    const handler = createInputDropdownHandler(dom);
    expect(() => handler(event)).not.toThrow();
    expect(dom.reveal).toHaveBeenCalledWith(textInput);
    expect(dom.enable).toHaveBeenCalledWith(textInput);
  });
});
