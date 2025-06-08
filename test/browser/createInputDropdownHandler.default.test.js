import { describe, it, expect, jest } from '@jest/globals';
import { createInputDropdownHandler } from '../../src/browser/toys.js';

describe('createInputDropdownHandler default branch', () => {
  it('hides and disables text input when select value is unknown', () => {
    const select = {};
    const container = {};
    const textInput = {};
    const event = {};
    const dom = {
      getCurrentTarget: jest.fn(() => select),
      getParentElement: jest.fn(() => container),
      querySelector: jest.fn((_, selector) =>
        selector === 'input[type="text"]' ? textInput : null
      ),
      getValue: jest.fn(() => 'unknown'),
      reveal: jest.fn(),
      enable: jest.fn(),
      hide: jest.fn(),
      disable: jest.fn(),
      removeChild: jest.fn(),
      addEventListener: jest.fn(),
      getNextSibling: jest.fn(() => null),
    };

    const handler = createInputDropdownHandler(dom);
    handler(event);

    expect(dom.hide).toHaveBeenCalledWith(textInput);
    expect(dom.disable).toHaveBeenCalledWith(textInput);
  });
});
