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

    expect(source).toContain("node --input-type=module <<'EOF'");
    expect(source).toContain("runtimeDepsRequire('@google-cloud/storage')");
    expect(source).toContain(".file(`${environment}/seed.json`)");
    expect(source).toContain('for (let attempt = 1; attempt <= 8; attempt += 1)');
    expect(source).toContain('await new Promise(resolve => setTimeout(resolve, attempt * 15000));');
  });
});
