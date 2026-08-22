import { describe, expect, it, jest } from '@jest/globals';
import {
  createTextElement,
  shouldRetryLoad,
  readErrorResponseBody,
  formatHttpErrorMessage,
  createModerateHandle,
} from '../../../src/core/browser/moderate.js';

describe('moderate pure helper contracts', () => {
  it('creates text elements with a safe empty fallback', () => {
    const element = { textContent: null };
    const document = { createElement: jest.fn(() => element) };
    createModerateHandle({
      documentObj: document,
      fetchFn: jest.fn(),
      sessionStorageObj: {},
      globalObject: {},
    });
    expect(createTextElement('p', 'hello')).toBe(element);
    expect(element.textContent).toBe('hello');
    expect(createTextElement('span', '')).toBe(element);
    expect(element.textContent).toBe('');
  });

  it('retries only the first HTTP 404 failure', () => {
    expect(shouldRetryLoad(new Error('HTTP 404: missing'), false)).toBe(true);
    expect(shouldRetryLoad(new Error('HTTP 404: missing'), true)).toBe(false);
    expect(shouldRetryLoad(new Error('HTTP 500'), false)).toBe(false);
    expect(shouldRetryLoad(null, false)).toBe(false);
  });

  it('reads optional error bodies and handles rejected readers', async () => {
    await expect(readErrorResponseBody({})).resolves.toBe('');
    await expect(readErrorResponseBody({ text: () => Promise.resolve('body') })).resolves.toBe('body');
    await expect(readErrorResponseBody({ text: () => Promise.reject(new Error('read')) })).resolves.toBe('');
  });

  it('formats trimmed and bounded HTTP error details', () => {
    expect(formatHttpErrorMessage(500, '  failed  ')).toBe('HTTP 500: failed');
    expect(formatHttpErrorMessage(404, '   ')).toBe('HTTP 404');
    expect(formatHttpErrorMessage(500, 'x'.repeat(301))).toBe(`HTTP 500: ${'x'.repeat(300)}`);
  });
});
