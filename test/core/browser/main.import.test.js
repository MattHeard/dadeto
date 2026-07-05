import { readFile } from 'node:fs/promises';

import { describe, expect, it } from '@jest/globals';

describe('core browser main import', () => {
  it('imports without touching browser globals at module load time', async () => {
    await expect(
      import('../../../src/core/browser/main.js')
    ).resolves.toHaveProperty('createMainHandle');
  });

  it('targets the prod error beacon endpoint', async () => {
    const source = await readFile('src/core/browser/main.js', 'utf8');

    expect(source).toContain("const beaconEndpoint = '/prod-errors';");
  });
});
