import { ensureString } from '../../../../src/core/cloud/render-contents/common-core.js';

describe('render contents common facade', () => {
  it('forwards ensureString to commonCore', () => {
    expect(ensureString('value')).toBe('value');
    expect(ensureString(null)).toBe('');
  });
});
