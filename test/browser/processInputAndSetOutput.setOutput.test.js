import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { processInputAndSetOutput } from '../../src/browser/toys.js';

describe('processInputAndSetOutput integration', () => {
  let elements;
  let env;
  let toyEnv;
  let processingFunction;

  beforeEach(() => {
    elements = {
      inputElement: { value: 'input' },
      outputParentElement: {},
      outputSelect: { value: 'text' },
      article: { id: 'post1' },
    };
    toyEnv = new Map([
      ['getData', () => ({ output: {} })],
      ['setLocalTemporaryData', jest.fn()],
    ]);
    env = {
      createEnv: jest.fn(() => toyEnv),
      dom: {
        setTextContent: jest.fn(),
        removeAllChildren: jest.fn(),
        appendChild: jest.fn(),
        createElement: jest.fn(() => ({})),
        addWarning: jest.fn(),
        removeWarning: jest.fn(),
      },
      fetchFn: jest.fn(),
      errorFn: jest.fn(),
      loggers: {
        logInfo: jest.fn(),
        logError: jest.fn(),
        logWarning: jest.fn(),
      },
    };
    processingFunction = jest.fn().mockReturnValue('result');
  });

  it('stores result with article id key via setOutput', () => {
    processInputAndSetOutput(elements, processingFunction, env);
    const callArg = toyEnv.get('setLocalTemporaryData').mock.calls[0][0];
    expect(callArg.output).toEqual({ [elements.article.id]: 'result' });
  });
});
