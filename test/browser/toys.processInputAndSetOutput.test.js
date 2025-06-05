import { describe, it, expect, jest } from '@jest/globals';
import { processInputAndSetOutput } from '../../src/browser/toys.js';

describe('processInputAndSetOutput', () => {
  it('handles valid JSON result using handleParsedResult', async () => {
    const inputElement = { value: 'ignored' };
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
      removeAllChildren: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(() => ({})),
      setTextContent: jest.fn(),
      addWarning: jest.fn(),
    };
    const toyEnv = { get: jest.fn(() => () => ({})) };
    const env = {
      createEnv: jest.fn(() => toyEnv),
      dom,
      errorFn: jest.fn(),
      fetchFn: jest.fn(() =>
        Promise.resolve({ text: () => Promise.resolve('body') })
      ),
    };
    const resultObj = { request: { url: 'https://example.com' } };
    const processingFunction = jest.fn(() => JSON.stringify(resultObj));

    await processInputAndSetOutput(elements, processingFunction, env);

    expect(env.fetchFn).toHaveBeenCalledWith('https://example.com');
    expect(dom.removeAllChildren).not.toHaveBeenCalled();
    expect(dom.appendChild).not.toHaveBeenCalled();
  });

  it('falls back to raw output when JSON is invalid', async () => {
    const inputElement = { value: 'ignored' };
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
      removeAllChildren: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(() => ({})),
      setTextContent: jest.fn(),
      addWarning: jest.fn(),
    };
    const toyEnv = { get: jest.fn(() => () => ({})) };
    const env = {
      createEnv: jest.fn(() => toyEnv),
      dom,
      errorFn: jest.fn(),
      fetchFn: jest.fn(),
    };
    const processingFunction = jest.fn(() => 'invalid json');

    await processInputAndSetOutput(elements, processingFunction, env);

    expect(env.fetchFn).not.toHaveBeenCalled();
    expect(dom.removeAllChildren).toHaveBeenCalledWith(parent);
    expect(dom.appendChild).toHaveBeenCalled();
  });

  it('stores the result keyed by article id', async () => {
    const inputElement = { value: 'ignored' };
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
      removeAllChildren: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(() => ({})),
      setTextContent: jest.fn(),
      addWarning: jest.fn(),
    };
    const setData = jest.fn();
    const toyEnv = new Map([
      ['getData', () => ({ output: {} })],
      ['setData', setData],
    ]);
    const env = {
      createEnv: jest.fn(() => toyEnv),
      dom,
      errorFn: jest.fn(),
      fetchFn: jest.fn(),
    };
    const result = 'ok';
    const processingFunction = jest.fn(() => result);

    await processInputAndSetOutput(elements, processingFunction, env);

    const callArg = setData.mock.calls[0][0];
    expect(callArg.output).toEqual({ [article.id]: result });
  });
});
