import { describe, test, expect, jest } from '@jest/globals';
import {
  isDisposable,
  disposeAndRemove,
  maybeRemoveElement,
} from '../../src/core/browser/browser-core.js';

describe('disposeHelpers', () => {
  test('isDisposable detects element with dispose', () => {
    expect(isDisposable({ _dispose: () => {} })).toBe(true);
    expect(isDisposable(null)).toBe(false);
    expect(isDisposable({})).toBe(false);
  });

  test('disposeAndRemove disposes and removes', () => {
    const element = { _dispose: jest.fn() };
    const dom = { removeChild: jest.fn() };
    disposeAndRemove(element, {}, dom);
    expect(element._dispose).toHaveBeenCalled();
    expect(dom.removeChild).toHaveBeenCalledWith({}, element);
  });

  test('maybeRemoveElement acts only on disposables', () => {
    const element = { _dispose: jest.fn() };
    const dom = { removeChild: jest.fn() };
    maybeRemoveElement(element, {}, dom);
    expect(dom.removeChild).toHaveBeenCalledWith({}, element);

    const otherDom = { removeChild: jest.fn() };
    maybeRemoveElement({}, {}, otherDom);
    expect(otherDom.removeChild).not.toHaveBeenCalled();
  });
});
