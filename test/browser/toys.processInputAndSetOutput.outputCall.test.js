import { describe, it, expect, jest } from '@jest/globals';

describe('processInputAndSetOutput setOutput call', () => {
  it('invokes setOutput with object keyed by article id', async () => {
    jest.resetModules();
    jest.unstable_mockModule('../../src/browser/setOutput.js', () => ({
      setOutput: jest.fn(),
    }));
    const setOutputModule = await import('../../src/browser/setOutput.js');
    const { processInputAndSetOutput } = await import('../../src/browser/toys.js');

    const inputElement = { value: 'ignored' };
    const article = { id: 'postx' };
    const outputSelect = { value: 'text' };
    const elements = { inputElement, article, outputSelect, outputParentElement: {} };

    const toyEnv = new Map([
      ['getData', () => ({})],
      ['setData', jest.fn()],
    ]);
    const createEnv = jest.fn(() => toyEnv);
    const dom = {
      setTextContent: jest.fn(),
      removeAllChildren: jest.fn(),
      createElement: jest.fn(() => ({})),
      appendChild: jest.fn(),
    };
    const fetchFn = jest.fn(() => Promise.resolve({ text: () => Promise.resolve('') }));
    const env = { createEnv, dom, fetchFn };
    const result = '{"request":{"url":""}}';
    const processingFunction = jest.fn(() => result);

    processInputAndSetOutput(elements, processingFunction, env);

    expect(setOutputModule.setOutput).toHaveBeenCalledWith(
      JSON.stringify({ [article.id]: result }),
      toyEnv
    );
  });
});
