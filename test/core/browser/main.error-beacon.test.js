/* @jest-environment jsdom */
import { afterEach, expect, it, jest } from '@jest/globals';
import { createMainHandle } from '../../../src/core/browser/main.js';
import {
  createDocumentHandle,
  logError,
} from '../../../src/core/browser/document.js';

const originalConsoleError = console.error;

afterEach(() => {
  console.error = originalConsoleError;
});

it('logs through the real DOM facade without recursion after repeated initialization', async () => {
  const nativeError = jest.fn(function () {
    expect(this).toBe(console);
  });
  console.error = nativeError;
  const fetchFn = jest.fn(async () => ({ json: async () => ({ posts: [] }) }));
  const windowObj = {
    console,
    fetch: fetchFn,
    location: { href: 'https://example.test/' },
    navigator: window.navigator,
    addEventListener: jest.fn(),
  };
  createDocumentHandle({
    documentObj: document,
    windowObj,
    globalThisObj: globalThis,
    navigatorObj: window.navigator,
  });
  const initialize = () =>
    createMainHandle({
      documentObj: document,
      windowObj,
      fetchFn,
      storageObj: null,
    })();
  initialize();
  expect(() => logError('first error', { detail: 'context' })).not.toThrow();
  initialize();
  expect(() => console.error('second error')).not.toThrow();
  await Promise.resolve();
  expect(nativeError.mock.calls).toEqual([
    ['first error', { detail: 'context' }],
    ['second error'],
  ]);
  const beacons = fetchFn.mock.calls.filter(([url]) =>
    url.endsWith('prod-errors')
  );
  expect(beacons).toHaveLength(2);
  expect(JSON.parse(beacons[1][1].body)).toMatchObject({
    message: 'second error',
    source: 'console.error',
  });
});
