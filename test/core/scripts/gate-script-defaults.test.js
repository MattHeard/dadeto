import { createDefaultGateScriptOptions } from '../../../src/core/scripts/gate-script-defaults.js';

describe('createDefaultGateScriptOptions', () => {
  it('returns the default gate paths, streams, and spawn result', () => {
    const options = createDefaultGateScriptOptions();

    expect(options.rootDir).toBe('.');
    expect(options.spawnResult).toEqual({ status: 0, signal: null });
    expect(typeof options.stdout.write).toBe('function');
    expect(typeof options.stderr.write).toBe('function');
    expect(options.stdout.write()).toBeUndefined();
    expect(options.stderr.write()).toBeUndefined();
    expect(createDefaultGateScriptOptions()).toEqual(options);
  });
});
