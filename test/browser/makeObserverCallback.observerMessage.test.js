import { describe, it, expect, jest } from '@jest/globals';
import { makeObserverCallback } from '../../src/browser/toys.js';

describe('makeObserverCallback observer message', () => {
  it('logs a message for each entry', () => {
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

    expect(logInfo).toHaveBeenCalledWith(
      `[${moduleInfo.article.id}]`,
      'Starting module import for article',
      moduleInfo.article.id,
      'module',
      moduleInfo.modulePath
    );
  });
});
