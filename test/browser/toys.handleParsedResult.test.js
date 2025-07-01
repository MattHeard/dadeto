import { jest } from '@jest/globals';
import { handleParsedResult } from '../../src/browser/toys.js';

describe('handleParsedResult', () => {
  let parsed, env, options, dom;

  beforeEach(() => {
    const removeAllChildren = jest.fn();
    const createElement = jest.fn(() => ({}));
    const setTextContent = jest.fn();
    const appendChild = jest.fn(); // This is the main appendChild for the dom mock

    dom = {
      removeAllChildren,
      createElement,
      setTextContent,
      appendChild,
    };

    const fetchFn = jest
      .fn()
      .mockResolvedValue({ text: () => Promise.resolve('response') });
    // dom is already defined and populated above
    const errorFn = jest.fn();

    env = {
      fetchFn,
      dom,
      errorFn,
    };

    const parent = {};
    const presenterKey = 'text';

    options = {
      parent,
      presenterKey,
    };
  });

  it('initiates a fetch and returns true when a valid parsed request is provided', () => {
    parsed = {
      request: {
        url: 'https://example.com',
      },
    };

    const result = handleParsedResult(parsed, env, options);

    expect(env.fetchFn).toHaveBeenCalledWith('https://example.com');
    expect(result).toBe(true);
  });

  it('does not initiate a fetch and returns false when an invalid parsed request is provided', () => {
    parsed = { invalid: 'request' }; // Missing required 'request' property

    const result = handleParsedResult(parsed, env, options);

    expect(env.fetchFn).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('returns false when request.url is not a string', () => {
    parsed = {
      request: { url: 123 },
    };

    const result = handleParsedResult(parsed, env, options);

    expect(env.fetchFn).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });
});
