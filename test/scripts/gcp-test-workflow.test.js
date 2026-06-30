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

    expect(source).toContain('ACCESS_TOKEN="$(gcloud auth print-access-token)"');
    expect(source).toContain(
      'SEED_UPLOAD_URL="https://storage.googleapis.com/upload/storage/v1/b/${TEST_STATIC_BUCKET}/o?uploadType=media&name=${ENVIRONMENT}/seed.json"'
    );
    expect(source).toContain('for attempt in $(seq 1 8); do');
    expect(source).toContain('--data-binary @/tmp/e2e-seed.json');
    expect(source).toContain('sleep "$((attempt * 15))"');
  });
});
