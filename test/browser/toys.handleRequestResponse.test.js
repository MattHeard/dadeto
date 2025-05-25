import { jest } from '@jest/globals';
import { handleRequestResponse } from '../../src/browser/toys.js';

describe('handleRequestResponse', () => {
  it('minimal test case', () => {
    const url = 'https://example.com';
    const dom = {
      removeAllChildren: jest.fn(),
      createElement: jest.fn().mockImplementation((tagName) => ({
        tagName: tagName.toUpperCase(),
        textContent: '',
        appendChild: jest.fn()
      })),
      setTextContent: jest.fn(),
      appendChild: jest.fn()
    };
    const env = {
      fetchFn: () => Promise.resolve({ text: () => Promise.resolve('response') }),
      dom,
      errorFn: jest.fn()
    };
    const options = {
      parent: {},
      presenterKey: 'text'
    };

    handleRequestResponse(url, env, options);
  });
});
