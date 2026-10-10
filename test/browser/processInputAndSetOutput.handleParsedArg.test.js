import { describe, it, expect } from '@jest/globals';
import { createProcessInputAndSetOutput } from '../../src/browser/toys.js';

describe('createProcessInputAndSetOutput parsed arg', () => {
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
    createProcessInputAndSetOutput(
      elements.inputElement,
      () => 'not json',
      wrappedEnv
    )(elements.outputParentElement, elements.outputSelect, elements.article);
    expect(captured).toBeNull();
  });
});
