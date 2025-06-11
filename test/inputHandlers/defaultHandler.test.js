import { defaultHandler } from '../../src/inputHandlers/default.js';
import { describe, test, expect, jest } from '@jest/globals';

describe('defaultHandler', () => {
  test('removes existing elements and ignores missing ones', () => {
    const container = {};
    const textInput = {};
    const number = { _dispose: jest.fn() };
    const kv = {};
    const querySelector = jest
      .fn()
      .mockReturnValueOnce(number)
      .mockReturnValueOnce(kv)
      .mockReturnValueOnce(null);
    const dom = {
      hide: jest.fn(),
      disable: jest.fn(),
      querySelector,
      removeChild: jest.fn(),
    };

    defaultHandler(dom, container, textInput);

    expect(dom.hide).toHaveBeenCalledWith(textInput);
    expect(dom.disable).toHaveBeenCalledWith(textInput);
    expect(number._dispose).toHaveBeenCalled();
    expect(dom.removeChild).toHaveBeenCalledWith(container, number);
    expect(dom.removeChild).toHaveBeenCalledTimes(1);
  });
});
