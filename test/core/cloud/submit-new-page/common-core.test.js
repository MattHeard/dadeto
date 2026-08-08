import { ensureString } from '../../../../src/core/cloud/submit-new-page/common-core.js';

describe('submit new page common facade', () => {
  it('forwards ensureString to commonCore', () => {
    expect(ensureString('value')).toBe('value');
    expect(ensureString(null)).toBe('');
  });
});
