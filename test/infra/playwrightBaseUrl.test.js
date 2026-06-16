import { readFile } from 'node:fs/promises';

import { describe, expect, it } from '@jest/globals';

describe('Playwright base URL contract', () => {
  it('passes the base URL through the env var that playwright.config.ts reads', async () => {
    const playwrightTf = await readFile('infra/playwright.tf', 'utf8');

    expect(playwrightTf).toContain('name  = "BASE_URL"');
    expect(playwrightTf).toContain('name  = "PLAYWRIGHT_BASE_URL"');
    expect(playwrightTf).toContain('name  = "API_BASE_URL"');
    expect(playwrightTf).toContain(
      'google_cloudfunctions2_function.get_api_key_credit_v2.service_config[0].uri'
    );
  });
});
