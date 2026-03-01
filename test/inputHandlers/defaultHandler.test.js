import { defaultHandler } from '../../src/core/browser/browser-core.js';
import { describe, test, expect, jest } from '@jest/globals';

describe('defaultHandler', () => {
  test('removes existing elements and ignores missing ones', () => {
    const container = {};
    const textInput = {};
    const number = { _dispose: jest.fn() };
    const kv = {};
    const textarea = { _dispose: jest.fn() };
    const querySelector = jest
      .fn()
      .mockReturnValueOnce(number)
      .mockReturnValueOnce(kv)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(textarea)
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
    expect(textarea._dispose).toHaveBeenCalled();
    expect(dom.removeChild).toHaveBeenCalledWith(container, number);
    expect(dom.removeChild).toHaveBeenCalledWith(container, textarea);
    expect(dom.removeChild).toHaveBeenCalledTimes(2);
  });

  test('removes an existing dendrite form when present', () => {
    const container = {};
    const textInput = {};
    const number = null;
    const kv = null;
    const dendrite = { _dispose: jest.fn() };
    const querySelector = jest
      .fn()
      .mockReturnValueOnce(number)
      .mockReturnValueOnce(kv)
      .mockReturnValueOnce(dendrite)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null);
    const dom = {
      hide: jest.fn(),
      disable: jest.fn(),
      querySelector,
      removeChild: jest.fn(),
    };

    defaultHandler(dom, container, textInput);

    expect(querySelector).toHaveBeenNthCalledWith(
      3,
      container,
      '.dendrite-form'
    );
    expect(querySelector).toHaveBeenNthCalledWith(
      4,
      container,
      '.toy-textarea'
    );
    expect(querySelector).toHaveBeenNthCalledWith(
      5,
      container,
      '.keyboard-capture-form'
    );
    expect(dendrite._dispose).toHaveBeenCalled();
    expect(dom.removeChild).toHaveBeenCalledWith(container, dendrite);
  });
});
