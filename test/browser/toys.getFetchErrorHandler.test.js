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
    const errorHandler = getFetchErrorHandler({ dom }, null, presenterKey);
    const error = {};
    errorHandler(error);
  });
});
