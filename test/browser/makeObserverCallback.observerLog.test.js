import { describe, it, expect, jest } from '@jest/globals';
import { makeObserverCallback } from '../../src/browser/toys.js';

describe('makeObserverCallback observer log', () => {
  it('logs a message for each observer entry when intersecting', () => {
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
      'Observer callback for article',
      moduleInfo.article.id
    );
  });
});
