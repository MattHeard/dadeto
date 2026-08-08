import { ensureString } from '../../../../src/core/cloud/get-api-key-credit/common-core.js';

describe('API key credit common facade', () => {
  it('forwards ensureString to commonCore', () => {
    expect(ensureString('value')).toBe('value');
    expect(ensureString(null)).toBe('');
  });
});
