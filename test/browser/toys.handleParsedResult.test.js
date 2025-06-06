import { jest } from '@jest/globals';
import { handleParsedResult } from '../../src/browser/toys.js';

describe('handleParsedResult', () => {
  let parsed, env, options, dom;

  beforeEach(() => {
    const removeAllChildren = jest.fn();
    const createElement = jest.fn().mockImplementation((tagName) => ({
      tagName: tagName.toUpperCase(),
      textContent: '',
      appendChild: jest.fn() // This appendChild is for the mocked element
    }));
    const setTextContent = jest.fn();
    const appendChild = jest.fn(); // This is the main appendChild for the dom mock

    dom = {
      removeAllChildren,
      createElement,
      setTextContent,
      appendChild
    };

    env = {
      fetchFn: jest.fn().mockResolvedValue({ text: () => Promise.resolve('response') }),
      dom,
      errorFn: jest.fn()
    };

    options = {
      parent: {},
      presenterKey: 'text'
    };
  });

  it('initiates a fetch and returns true when a valid parsed request is provided', () => {
    parsed = {
      request: {
        url: 'https://example.com'
      }
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
});
