import { readFileSync } from 'node:fs';

describe('gcp-test workflow report handling', () => {
  it('downloads the cloud-generated Playwright report before artifact upload', () => {
    const source = readFileSync('.github/workflows/gcp-test.yml', 'utf8');

    expect(source).toContain('Download Playwright report from GCS');
    expect(source).toContain('download_tree playwright-report');
    expect(source).toContain('download_tree test-results');
    expect(source).toContain('gcloud storage cp -r "${REPORT_ROOT}/${tree}" .');
  });

  it('retries the seed object upload before failing the run', () => {
    const source = readFileSync('.github/workflows/gcp-test.yml', 'utf8');

    expect(source).toContain('upload_seed()');
    expect(source).toContain('gcloud storage cp /tmp/e2e-seed.json');
    expect(source).toContain('for attempt in 1 2 3 4 5 6; do');
    expect(source).toContain('sleep $((attempt * 10))');
  });
});
