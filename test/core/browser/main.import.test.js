import { describe, expect, it } from '@jest/globals';

describe('core browser main import', () => {
  it('imports without touching browser globals at module load time', async () => {
    await expect(
      import('../../../src/core/browser/main.js')
    ).resolves.toHaveProperty('createMainHandle');
  });
});
