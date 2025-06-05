import { describe, it, expect, jest } from '@jest/globals';

// Dynamically import processInputAndSetOutput so coverage maps to this test

describe('processInputAndSetOutput dynamic setOutput', () => {
  it('stores the result keyed by article id', async () => {
    const { processInputAndSetOutput } = await import(
      '../../src/browser/toys.js'
    );

    const inputElement = { value: 'input' };
    const parent = {};
    const outputSelect = { value: 'text' };
    const article = { id: 'a1' };
    const elements = {
      inputElement,
      outputParentElement: parent,
      outputSelect,
      article,
    };
    const dom = {
      setTextContent: jest.fn(),
      removeAllChildren: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(() => ({})),
      addWarning: jest.fn(),
      removeWarning: jest.fn(),
    };
    const toyEnv = new Map([
      ['getData', () => ({ output: {} })],
      ['setData', jest.fn()],
    ]);
    const env = {
      createEnv: jest.fn(() => toyEnv),
      fetchFn: jest.fn(() =>
        Promise.resolve({ text: jest.fn(() => Promise.resolve('')) })
      ),
      dom,
      errorFn: jest.fn(),
      loggers: {
        logInfo: jest.fn(),
        logError: jest.fn(),
        logWarning: jest.fn(),
      },
    };
    const result = 'ok';
    const processingFunction = jest.fn(() => result);

    processInputAndSetOutput(elements, processingFunction, env);

    const setData = toyEnv.get('setData');
    const callArg = setData.mock.calls[0][0];
    expect(callArg.output).toEqual({ [article.id]: result });
  });
});
