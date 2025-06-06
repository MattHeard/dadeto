import { describe, test, expect, jest } from '@jest/globals';
import * as toys from '../../src/browser/toys.js';

const { processInputAndSetOutput } = toys;

describe('parseJSONResult via exported function', () => {
  test('passes null to handleParsedResult when JSON is invalid', () => {
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
    const env = {
      createEnv: jest.fn(() => new Map()),
      dom,
      errorFn: jest.fn(),
      fetchFn: jest.fn(),
    };
    const processingFunction = jest.fn(() => 'not json');
    const spy = jest.spyOn(toys, 'handleParsedResult');

    processInputAndSetOutput(elements, processingFunction, env);

    expect(spy).toHaveBeenCalledWith(null, env, {
      parent,
      presenterKey: outputSelect.value,
    });
    spy.mockRestore();
  });
});
