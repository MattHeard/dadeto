import { describe, it, expect, jest } from '@jest/globals';

jest.unstable_mockModule('../../src/core/browser/inputHandlers/textarea.js', () => ({
  textareaHandler: jest.fn(),
}));

const { lifeSeedHandler } = await import(
  '../../src/core/browser/inputHandlers/lifeSeedHandler.js'
);
const { textareaHandler } = await import(
  '../../src/core/browser/inputHandlers/textarea.js'
);

describe('lifeSeedHandler', () => {
  it('delegates to the textarea handler', () => {
    const dom = {};
    const container = {};
    const textInput = {};

    lifeSeedHandler(dom, container, textInput);

    expect(textareaHandler).toHaveBeenCalledWith(dom, container, textInput);
  });
});
