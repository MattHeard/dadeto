import { ensureString } from '../../../../src/core/cloud/submit-moderation-rating/common-core.js';

describe('submit moderation common facade', () => {
  it('forwards ensureString to commonCore', () => {
    expect(ensureString('value')).toBe('value');
    expect(ensureString(null)).toBe('');
  });
});
