import { readFile } from 'node:fs/promises';

import { describe, expect, it } from '@jest/globals';

describe('Playwright base URL contract', () => {
  it('passes the base URL through the env var that playwright.config.ts reads', async () => {
    const playwrightTf = await readFile('infra/playwright.tf', 'utf8');

    expect(playwrightTf).toContain('name  = "BASE_URL"');
    expect(playwrightTf).toContain('name  = "PLAYWRIGHT_BASE_URL"');
  });
});
