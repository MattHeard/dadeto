import { describe, expect, jest, test } from '@jest/globals';
import { textHandler } from '../../../src/core/browser/inputHandlers/text.js';

describe('textHandler', () => {
  test('reveals the text input and runs shared cleanup handlers', () => {
    const dom = {
      reveal: jest.fn(),
      enable: jest.fn(),
      hide: jest.fn(),
      disable: jest.fn(),
      querySelector: jest.fn(() => null),
      removeChild: jest.fn(),
    };
    const container = {};
    const textInput = {};

    textHandler(dom, container, textInput);

    expect(dom.reveal).toHaveBeenCalledWith(textInput);
    expect(dom.enable).toHaveBeenCalledWith(textInput);
    expect(dom.hide).not.toHaveBeenCalled();
  });
});
