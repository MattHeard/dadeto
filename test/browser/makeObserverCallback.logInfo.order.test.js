import { describe, it, expect, jest } from '@jest/globals';
import { makeObserverCallback } from '../../src/browser/toys.js';

describe('makeObserverCallback logging order', () => {
  it('logs module import first', () => {
    const dom = {
      removeAllChildren: jest.fn(),
      importModule: jest.fn(),
      disconnectObserver: jest.fn(),
      isIntersecting: () => true,
      error: jest.fn(),
      contains: () => true,
    };
    const logInfo = jest.fn();
    const env = { loggers: { logInfo, logError: jest.fn() } };
    const moduleInfo = {
      modulePath: 'mod.js',
      article: { id: 'art' },
      functionName: 'fn',
    };
    const observerCallback = makeObserverCallback(moduleInfo, env, dom);
    const observer = {};
    const entry = {};

    observerCallback([entry], observer);

    expect(logInfo).toHaveBeenNthCalledWith(
      1,
      `[${moduleInfo.article.id}]`,
      'Starting module import for article',
      moduleInfo.article.id,
      'module',
      moduleInfo.modulePath
    );
    expect(logInfo).toHaveBeenCalledTimes(1);
  });
});
