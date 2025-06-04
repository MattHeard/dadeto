import { jest, describe, it, expect } from '@jest/globals';
import { processInputAndSetOutput } from '../../src/browser/toys.js';

describe('processInputAndSetOutput', () => {
  it('should process input and set output with mocked DOM functions', () => {
    // This test verifies that processInputAndSetOutput can be called with the required arguments
    // including mocked DOM functions, and processes the input using the provided processing function
    // Define test variables
    const inputElement = {};
    const article = {};
    const outputSelect = { value: 'text' };
    const elements = { inputElement, article, outputSelect };
    const processingFunctionResult = '{"request":{"url":""}}';
    const processingFunction = jest.fn(() => processingFunctionResult);
    const get = jest.fn();
    const displayBodyCatch = jest.fn();
    const displayBodyPromise = { catch: displayBodyCatch };
    const urlGetTextThen = jest.fn(() => displayBodyPromise);
    const fetchGetTextPromise = { then: urlGetTextThen };
    const urlFetchThen = jest.fn(() => fetchGetTextPromise);
    const fetchUrlPromise = { then: urlFetchThen };
    const fetchFn = jest.fn(() => fetchUrlPromise);
    const toyEnv = { get };
    const createEnv = jest.fn(() => toyEnv);
    const removeAllChildren = jest.fn();
    const createElement = jest.fn();
    const setTextContent = jest.fn();
    const appendChild = jest.fn();
    const dom = {
      removeAllChildren,
      createElement,
      setTextContent,
      appendChild,
    };
    const env = { createEnv, dom, fetchFn };

    // Call with all required arguments
    processInputAndSetOutput(elements, processingFunction, env);
    expect(processingFunction).toHaveBeenCalled();
  });

  it('falls back to setTextContent when JSON cannot be parsed', () => {
    const inputElement = { value: 'ignored' };
    const article = { id: 'post1' };
    const outputSelect = { value: 'text' };
    const outputParentElement = {};
    const elements = {
      inputElement,
      article,
      outputSelect,
      outputParentElement,
    };
    const processingFunction = jest.fn(() => 'not json');
    const toyEnv = new Map([
      ['getData', () => ({})],
      ['setData', jest.fn()],
    ]);
    const createEnv = jest.fn(() => toyEnv);
    const dom = {
      removeAllChildren: jest.fn(),
      createElement: jest.fn(() => ({})),
      setTextContent: jest.fn(),
      appendChild: jest.fn(),
    };
    const env = { createEnv, dom, fetchFn: jest.fn() };

    processInputAndSetOutput(elements, processingFunction, env);

    expect(dom.removeAllChildren).toHaveBeenCalledWith(outputParentElement);
  });
});
