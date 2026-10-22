import { readFileSync } from 'node:fs';
import { describe, expect, it } from '@jest/globals';

describe('full-check workflow', () => {
  it('runs the full gate for pull requests and main with browser setup', () => {
    const workflow = readFileSync('.github/workflows/check.yml', 'utf8');

    expect(workflow).toContain('npx playwright install --with-deps chromium');
    expect(workflow.indexOf('Install Playwright Chromium')).toBeLessThan(
      workflow.indexOf('Run full checks')
    );
    expect(workflow).toContain('pull_request:');
    expect(workflow).toContain('branches:');
    expect(workflow).toContain('timeout-minutes: 120');
    expect(workflow).toContain('DADETO_COVERAGE_SHARD_SIZE: 20');
    expect(workflow).toContain('DADETO_COVERAGE_WORKER_HEAP_MB: 1536');
    expect(workflow).toContain('DADETO_CHECK_PROGRESS_INTERVAL_MS: 3000');
    expect(workflow).toContain(
      'Progress interval: ${DADETO_CHECK_PROGRESS_INTERVAL_MS} ms'
    );
    expect(workflow).toContain('npm run check:full');
  });

  it('writes a summary and uploads available artifacts after success or failure', () => {
    const workflow = readFileSync('.github/workflows/check.yml', 'utf8');

    expect(workflow).toContain('if: always()');
    expect(workflow).toContain('node src/local/write-check-full-report.js');
    expect(workflow).toContain('actions/upload-artifact@v6');
    expect(workflow).toContain('reports/check-full.log');
    expect(workflow).toContain('reports/coverage/');
    expect(workflow).toContain('reports/threefold-mobile.png');
  });
});
