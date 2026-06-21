import { readFileSync } from 'node:fs';

describe('Playwright container entrypoint', () => {
  it('invokes the unified e2e runner for the cloud suite', () => {
    const source = readFileSync('docker/playwright/entrypoint.sh', 'utf8');

    expect(source).toContain('cd /app');
    expect(source).toContain(
      'exec node scripts/run-e2e.js --suite cloud --environment ephemeral-gcp'
    );
  });
});
