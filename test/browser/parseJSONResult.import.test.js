import { describe, it, expect, jest } from '@jest/globals';

// Ensure Stryker can mutate this module by importing it normally

describe('processInputAndSetOutput with invalid JSON', () => {
  it('does not throw when JSON parsing fails', async () => {
    jest.resetModules();
    jest.unstable_mockModule('../../src/browser/setOutput.js', () => ({
      setOutput: jest.fn(),
    }));
    const { processInputAndSetOutput } = await import(
      '../../src/browser/toys.js'
    );

    const elements = {
      inputElement: { value: 'ignored' },
      article: { id: 'post1' },
      outputSelect: { value: 'text' },
      outputParentElement: {},
    };
    const env = {
      createEnv: jest.fn(() => new Map()),
      dom: {
        setTextContent: jest.fn(),
        removeAllChildren: jest.fn(),
        createElement: jest.fn(() => ({})),
        appendChild: jest.fn(),
      },
    };
    const processingFunction = jest.fn(() => 'not json');

    expect(() =>
      processInputAndSetOutput(elements, processingFunction, env)
    ).not.toThrow();
  });
});
