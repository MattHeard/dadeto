import { ensureString } from '../../../../src/core/cloud/submit-new-story/common-core.js';

describe('submit new story common facade', () => {
  it('forwards ensureString to commonCore', () => {
    expect(ensureString('value')).toBe('value');
    expect(ensureString(null)).toBe('');
  });
});
