import { describe, it, expect, jest } from '@jest/globals';
import { makeObserverCallback } from '../../src/browser/toys.js';

describe('makeObserverCallback logInfo fallback', () => {
  it('uses noop when logInfo is missing', () => {
    const dom = {
      removeAllChildren: jest.fn(),
      importModule: jest.fn(),
      disconnectObserver: jest.fn(),
      isIntersecting: () => true,
      error: jest.fn(),
      contains: () => true,
    };
    const env = { loggers: { logError: jest.fn(), logWarning: jest.fn() } };
    const moduleInfo = {
      modulePath: 'mod.js',
      article: { id: 'art2' },
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
