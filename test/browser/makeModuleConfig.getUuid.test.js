import { describe, it, expect } from '@jest/globals';
import { makeModuleConfig } from '../../src/browser/toys.js';

describe('makeModuleConfig', () => {
  it('includes getUuid from env', () => {
    const env = {
      globalState: {},
      createEnv: () => {},
      error: () => {},
      fetch: () => {},
      loggers: { logInfo: () => {}, logError: () => {}, logWarning: () => {} },
      getUuid: () => 'id',
    };
    const cfg = makeModuleConfig(env, {});
    expect(cfg.getUuid).toBe(env.getUuid);
  });
});
