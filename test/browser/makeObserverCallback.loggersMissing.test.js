import { describe, it, expect, jest } from '@jest/globals';
import { makeObserverCallback } from '../../src/browser/toys.js';

describe('makeObserverCallback with complete loggers', () => {
  it('imports module when loggers include logInfo', () => {
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
    const cb = makeObserverCallback(moduleInfo, env, dom);
    const observer = {};
    const entry = {};
    expect(() => cb([entry], observer)).not.toThrow();
    expect(env.loggers.logInfo).toHaveBeenCalled();
    expect(dom.importModule).toHaveBeenCalledWith(
      moduleInfo.modulePath,
      expect.any(Function),
      expect.any(Function)
    );
  });
});
