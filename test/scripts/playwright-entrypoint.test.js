import { readFileSync } from 'node:fs';

describe('Playwright container entrypoint', () => {
  it('uses the repository root Playwright config explicitly', () => {
    const source = readFileSync('docker/playwright/entrypoint.sh', 'utf8');

    expect(source).toContain('CONFIG=(--config ./playwright.config.ts)');
    expect(source).toContain('TEST_DIR="test/e2e"');
    expect(source).toContain('log "PWD=$(pwd)"');
    expect(source).toContain('log "PLAYWRIGHT_BIN=${PLAYWRIGHT_BIN}"');
    expect(source).toContain(
      'log "PLAYWRIGHT_CONFIG=$(realpath ./playwright.config.ts 2>/dev/null || printf \'%s\\n\' \'./playwright.config.ts\')"'
    );
    expect(source).toContain(
      'log "TEST_DIR=$(realpath "$TEST_DIR" 2>/dev/null || printf \'%s\\n\' "$TEST_DIR")"'
    );
    expect(source).toContain('log "test/e2e entries:"');
    expect(source).toContain('find "$TEST_DIR" -maxdepth 2 -type f | sort | sed \'s/^/  /\'');
    expect(source).toContain(
      'test "${CONFIG[@]}" "$TEST_DIR" --list --reporter=list'
    );
    expect(source).toContain(
      'test "${CONFIG[@]}" "$TEST_DIR" $ARGS --trace=retain-on-failure'
    );
  });
});
