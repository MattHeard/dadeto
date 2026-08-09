import { ensureString } from '../../../../src/core/cloud/generate-stats/common-core.js';

describe('generate-stats common core', () => {
  it('delegates string normalization to the shared helper', () => {
    expect(ensureString('  value  ')).toBe('  value  ');
    expect(ensureString(null)).toBe('');
  });
});
