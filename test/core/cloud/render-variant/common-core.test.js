import { ensureString } from '../../../../src/core/cloud/render-variant/common-core.js';

describe('render variant common facade', () => {
  it('forwards ensureString to commonCore', () => {
    expect(ensureString('value')).toBe('value');
    expect(ensureString(null)).toBe('');
  });
});
