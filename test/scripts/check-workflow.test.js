import { readFileSync } from 'node:fs';
import { describe, expect, it } from '@jest/globals';

describe('check workflow browser setup', () => {
  it('installs the Playwright browser before running the aggregate check', () => {
    const workflow = readFileSync('.github/workflows/check.yml', 'utf8');

    expect(workflow).toContain('npx playwright install --with-deps chromium');
    expect(workflow.indexOf('Install Playwright Chromium')).toBeLessThan(
      workflow.indexOf('Run checks')
    );
  });
});
