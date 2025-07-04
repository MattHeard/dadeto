import { describe, it, jest } from '@jest/globals';
import { getFetchErrorHandler } from '../../src/browser/toys.js';

describe('getFetchErrorHandler', () => {
  it('can be invoked with no args', () => {
    const removeAllChildren = jest.fn();
    const createElement = jest.fn();
    const setTextContent = jest.fn();
    const appendChild = jest.fn();
    const addWarning = jest.fn();

    const dom = {
      removeAllChildren,
      createElement,
      setTextContent,
      appendChild,
      addWarning,
    };

    const presenterKey = 'text';
    const errorFn = jest.fn();
    const errorHandler = getFetchErrorHandler(
      { dom, errorFn },
      null,
      presenterKey
    );
    const error = {};
    errorHandler(error);
    expect(errorFn).toHaveBeenCalled();
  });

  it('adds a warning with a prefixed message', () => {
    const parent = { firstChild: null };
    const dom = {
      removeAllChildren: jest.fn(() => {
        parent.firstChild = null;
      }),
      createElement: jest.fn(() => ({
        textContent: '',
        appendChild: jest.fn(),
      })),
      setTextContent: jest.fn((el, text) => {
        el.textContent = text;
      }),
      appendChild: jest.fn((p, child) => {
        p.firstChild = child;
      }),
      addWarning: jest.fn(),
    };
    const presenterKey = 'text';
    const errorFn = jest.fn();
    const errorHandler = getFetchErrorHandler(
      { dom, errorFn },
      parent,
      presenterKey
    );
    const error = new Error('boom');

    errorHandler(error);

    expect(dom.setTextContent).toHaveBeenCalledWith(
      expect.anything(),
      `Error fetching URL: ${error.message}`
    );
    expect(parent.firstChild.textContent).toBe(
      `Error fetching URL: ${error.message}`
    );
    expect(dom.addWarning).toHaveBeenCalledWith(parent);
  });
});
