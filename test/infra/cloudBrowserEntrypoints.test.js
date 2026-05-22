import { readFile } from 'node:fs/promises';

import { describe, expect, it } from '@jest/globals';

describe('cloud browser entrypoints', () => {
  it('uploads root browser wrappers instead of deep core modules', async () => {
    await expect(readFile('infra/admin-core.js', 'utf8')).resolves.toBe(
      "export * from '../core/browser/admin-core.js';\n"
    );
    await expect(
      readFile('infra/load-static-config-core.js', 'utf8')
    ).resolves.toBe(
      "export * from '../core/browser/load-static-config-core.js';\n"
    );
  });
});
