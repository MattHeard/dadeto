import { describe, it, expect, jest } from '@jest/globals';
import { makeObserverCallback } from '../../src/browser/toys.js';

describe('makeObserverCallback with logInfo defined', () => {
  it('calls logInfo when defined', () => {
    const dom = {
      removeAllChildren: jest.fn(),
      importModule: jest.fn(),
      disconnectObserver: jest.fn(),
      isIntersecting: () => true,
      error: jest.fn(),
      contains: () => true,
    };
    const env = { loggers: { logInfo: jest.fn() } };
    const moduleInfo = {
      modulePath: 'mod.js',
      article: { id: 'art' },
      functionName: 'fn',
    };
    const observerCallback = makeObserverCallback(moduleInfo, env, dom);
    const observer = {};
    const entry = {};
    expect(() => observerCallback([entry], observer)).not.toThrow();
    expect(env.loggers.logInfo).toHaveBeenCalled();
  });
});
