import { ensureString } from '../../../../src/core/cloud/get-api-key-credit-v2/common-core.js';

describe('API key credit v2 common facade', () => {
  it('forwards ensureString to commonCore', () => {
    expect(ensureString('value')).toBe('value');
    expect(ensureString(null)).toBe('');
  });
});
