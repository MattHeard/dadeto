import { ensureString } from '../../../../src/core/cloud/generate-stats/admin-config.js';

describe('generate-stats admin config facade', () => {
  it('forwards ensureString to common configuration handling', () => {
    expect(ensureString('configured')).toBe('configured');
    expect(ensureString(undefined)).toBe('');
  });
});
