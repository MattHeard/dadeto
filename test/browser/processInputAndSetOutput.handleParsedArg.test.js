import { describe, it, expect } from '@jest/globals';
import { processInputAndSetOutput } from '../../src/browser/toys.js';

describe('processInputAndSetOutput parsed arg', () => {
  it('passes null to handleParsedResult when JSON is invalid', () => {
    const elements = {
      inputElement: { value: 'x' },
      outputParentElement: {},
      outputSelect: { value: 'text' },
      article: { id: 'a1' },
    };
    const toyEnv = new Map([
      ['getData', () => ({ output: {} })],
      ['setLocalTemporaryData', () => {}],
    ]);
    const env = {
      createEnv: () => toyEnv,
      fetchFn: () => Promise.resolve({ text: () => Promise.resolve('') }),
      dom: {
        setTextContent: () => {},
        removeAllChildren: () => {},
        appendChild: () => {},
        createElement: () => ({}),
        addWarning: () => {},
        removeWarning: () => {},
      },
      errorFn: () => {},
      loggers: { logInfo: () => {}, logError: () => {}, logWarning: () => {} },
    };

    let captured = null;
    const wrappedEnv = {
      ...env,
      dom: {
        ...env.dom,
        addWarning: () => {
          captured = null;
        },
      },
    };
    processInputAndSetOutput(elements, () => 'not json', wrappedEnv);
    expect(captured).toBeNull();
  });
});
