import { describe, it, expect, jest } from '@jest/globals';
import { createProcessInputAndSetOutput } from '../../src/browser/toys.js';

describe('createProcessInputAndSetOutput invalid JSON handling', () => {
  it('handles parse errors gracefully', () => {
    const elements = {
      inputElement: { value: 'input' },
      outputParentElement: {},
      outputSelect: { value: 'text' },
      article: { id: 'a1' },
    };

    const toyEnv = new Map([
      ['getData', () => ({})],
      ['setLocalTemporaryData', jest.fn()],
    ]);

    const dom = {
      setTextContent: jest.fn(),
      removeAllChildren: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(() => ({})),
      addWarning: jest.fn(),
      removeWarning: jest.fn(),
    };

    const env = {
      createEnv: () => toyEnv,
      fetchFn: jest.fn(() => Promise.resolve({ text: jest.fn() })),
      dom,
      errorFn: jest.fn(),
      loggers: {
        logInfo: jest.fn(),
        logError: jest.fn(),
        logWarning: jest.fn(),
      },
    };

    expect(() =>
      createProcessInputAndSetOutput(
        elements.inputElement,
        () => 'not json',
        env
      )(elements.outputParentElement, elements.outputSelect, elements.article)
    ).not.toThrow();

    expect(dom.removeAllChildren).toHaveBeenCalledWith(
      elements.outputParentElement
    );
  });
});
