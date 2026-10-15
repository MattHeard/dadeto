import { readFileSync } from 'node:fs';

describe('Netlify production deployment workflow', () => {
  const source = readFileSync('.github/workflows/netlify-prod.yml', 'utf8');

  it('requires the production rental search endpoint before deployment', () => {
    const configurationIndex = source.indexOf('DADETO_BUILD_TARGET=production');
    const buildIndex = source.indexOf('npm run build:browser');
    const verifyIndex = source.indexOf(
      'Verify production rental search endpoint'
    );
    const deployIndex = source.indexOf('Deploy to Netlify production');

    expect(configurationIndex).toBeGreaterThanOrEqual(0);
    expect(configurationIndex).toBeLessThan(buildIndex);
    expect(verifyIndex).toBeGreaterThan(buildIndex);
    expect(deployIndex).toBeGreaterThan(verifyIndex);
    expect(source).toContain(
      `grep -Eq 'data-search-endpoint="https://[^"]+"' "$PAGE"`
    );
  });

  it('uses an endpoint artifact only for an explicitly dispatched production build', () => {
    expect(source).toContain('gcp_prod_run_id:');
    expect(source).toContain(
      "GCP_PROD_RUN_ID: ${{ github.event_name == 'workflow_dispatch'"
    );
    expect(source).toContain('gh run download "$GCP_PROD_RUN_ID"');
    expect(source).toContain('--name object-minute-rental-search-url');
    expect(source).toContain('actions: read');
    expect(source).toContain(
      'OBJECT_MINUTE_RENTAL_SEARCH_URL: ${{ vars.OBJECT_MINUTE_RENTAL_SEARCH_URL }}'
    );
    expect(source).toContain('\n  push:\n');
  });
});
