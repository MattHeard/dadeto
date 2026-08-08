import { ensureString } from '../../../../src/core/cloud/generate-stats/common-core.js';

describe('generate-stats common facade', () => {
  it('forwards ensureString to commonCore', () => {
    expect(ensureString('value')).toBe('value');
    expect(ensureString(null)).toBe('');
  });
});
