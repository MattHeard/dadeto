import { describe, it, expect, jest } from '@jest/globals';
import { makeObserverCallback } from '../../src/browser/toys.js';

describe('makeObserverCallback missing loggers.logInfo', () => {
  it('falls back to a noop logger and still imports the module', () => {
    const dom = {
      removeAllChildren: jest.fn(),
      importModule: jest.fn(),
      disconnectObserver: jest.fn(),
      isIntersecting: () => true,
      error: jest.fn(),
      contains: () => true,
    };
    const env = { loggers: { logError: jest.fn() } };
    const moduleInfo = { modulePath: 'mod.js', article: { id: 'art' }, functionName: 'fn' };
    const callback = makeObserverCallback(moduleInfo, env, dom);
    const observer = {};
    const entry = {};

    expect(() => callback([entry], observer)).not.toThrow();
    expect(dom.importModule).toHaveBeenCalledWith('mod.js', expect.any(Function), expect.any(Function));
    expect(dom.disconnectObserver).toHaveBeenCalledWith(observer);
  });
});
