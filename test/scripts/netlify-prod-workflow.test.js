import { readFileSync } from 'node:fs';

describe('Netlify production deployment workflow', () => {
  const source = readFileSync('.github/workflows/netlify-prod.yml', 'utf8');
  const resolver = readFileSync(
    '.github/scripts/resolve-netlify-rental-endpoint.sh',
    'utf8'
  );

  it('requires the production rental search endpoint before deployment', () => {
    const configurationIndex = source.indexOf(
      'resolve-netlify-rental-endpoint.sh'
    );
    const buildIndex = source.indexOf('npm run build:browser');
    const verifyIndex = source.indexOf(
      'Verify production rental search endpoint'
    );
    const deployIndex = source.indexOf('Deploy to Netlify production');

    expect(configurationIndex).toBeGreaterThanOrEqual(0);
    expect(configurationIndex).toBeLessThan(buildIndex);
    expect(resolver).toContain('DADETO_BUILD_TARGET=production');
    expect(verifyIndex).toBeGreaterThan(buildIndex);
    expect(deployIndex).toBeGreaterThan(verifyIndex);
    expect(source).toContain(
      `grep -Eq 'data-search-endpoint="https://[^"]+"' "$PAGE"`
    );
  });

  it('resolves both push and manual deploy endpoints from validated gcp-prod artifacts', () => {
    expect(source).toContain('gcp_prod_run_id:');
    expect(source).toContain(
      "GCP_PROD_RUN_ID: ${{ github.event_name == 'workflow_dispatch'"
    );
    expect(source).toContain(
      'run: bash .github/scripts/resolve-netlify-rental-endpoint.sh'
    );
    expect(source).toContain('actions: read');
    expect(source).not.toContain('vars.OBJECT_MINUTE_RENTAL_SEARCH_URL');
    expect(source).toContain('\n  push:\n');
    expect(source).toContain('workflow_dispatch:');
  });
});
