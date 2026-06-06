import { readFileSync } from 'node:fs';

describe('Playwright container entrypoint', () => {
  it('uses the repository root Playwright config explicitly', () => {
    const source = readFileSync('docker/playwright/entrypoint.sh', 'utf8');

    expect(source).toContain('CONFIG=(--config ./playwright.config.ts)');
    expect(source).toContain('TEST_DIR="test/e2e"');
    expect(source).toContain(
      'test "${CONFIG[@]}" "$TEST_DIR" --list --reporter=list'
    );
    expect(source).toContain(
      'test "${CONFIG[@]}" "$TEST_DIR" $ARGS --trace=retain-on-failure'
    );
  });
});
