import { describe, it, expect, jest } from '@jest/globals';
import { makeObserverCallback } from '../../src/browser/toys.js';

describe('makeObserverCallback with logInfo present', () => {
  it('imports the module when logInfo is provided', () => {
    const dom = {
      removeAllChildren: jest.fn(),
      importModule: jest.fn(),
      disconnectObserver: jest.fn(),
      isIntersecting: () => true,
      error: jest.fn(),
      contains: () => true,
    };
    const env = { loggers: { logError: jest.fn(), logInfo: jest.fn() } };
    const moduleInfo = {
      modulePath: 'mod.js',
      article: { id: 'art' },
      functionName: 'fn',
    };
    const callback = makeObserverCallback(moduleInfo, env, dom);
    const observer = {};
    const entry = {};

    expect(() => callback([entry], observer)).not.toThrow();
    expect(env.loggers.logInfo).toHaveBeenCalled();
    expect(dom.importModule).toHaveBeenCalledWith(
      'mod.js',
      expect.any(Function),
      expect.any(Function)
    );
    expect(dom.disconnectObserver).toHaveBeenCalledWith(observer);
  });
});
