import { describe, it, expect, jest } from '@jest/globals';
import { makeObserverCallback } from '../../src/browser/toys.js';

describe('makeObserverCallback logging', () => {
  it('logs module import when entry is intersecting', () => {
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
      'Observer callback for article',
      moduleInfo.article.id
    );

    expect(logInfo).toHaveBeenCalledWith(
      `[${moduleInfo.article.id}]`,
      'Starting module import for article',
      moduleInfo.article.id,
      'module',
      moduleInfo.modulePath
    );
  });

  it('logs observer callback when entry is intersecting', () => {
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
      'Observer callback for article',
      moduleInfo.article.id
    );
  });

  it('handles missing loggers without throwing', () => {
    const dom = {
      removeAllChildren: jest.fn(),
      importModule: jest.fn(),
      disconnectObserver: jest.fn(),
      isIntersecting: () => true,
      error: jest.fn(),
      contains: () => true,
    };
    const env = { loggers: {} }; // loggers without logInfo
    const moduleInfo = {
      modulePath: 'mod.js',
      article: { id: 'art' },
      functionName: 'fn',
    };
    const observerCallback = makeObserverCallback(moduleInfo, env, dom);
    const observer = {};
    const entry = {};

    expect(() => observerCallback([entry], observer)).not.toThrow();
    expect(dom.importModule).toHaveBeenCalledWith(
      moduleInfo.modulePath,
      expect.any(Function),
      expect.any(Function)
    );
    expect(dom.disconnectObserver).toHaveBeenCalledWith(observer);
  });
});
