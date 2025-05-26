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
      addWarning
    };

    const presenterKey = 'text';
    const errorFn = jest.fn();
    const errorHandler = getFetchErrorHandler({ dom, errorFn }, null, presenterKey);
    const error = {};
    errorHandler(error);
  });
});
