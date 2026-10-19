import { readFileSync } from 'node:fs';

describe('Netlify production deployment workflow', () => {
  const source = readFileSync('.github/workflows/netlify-prod.yml', 'utf8');
  const resolver = readFileSync(
    '.github/scripts/fetch-function-endpoint-registry.js',
    'utf8'
  );

  it('fetches and validates the registry before build and deployment', () => {
    const configurationIndex = source.indexOf(
      'fetch-function-endpoint-registry.js'
    );
    const buildIndex = source.indexOf('npm run build:browser');
    const verifyIndex = source.indexOf(
      'Verify production rental search endpoint'
    );
    const deployIndex = source.indexOf('Deploy to Netlify production');

    expect(configurationIndex).toBeGreaterThanOrEqual(0);
    expect(configurationIndex).toBeLessThan(buildIndex);
    expect(resolver).toContain('DADETO_BUILD_TARGET=production');
    expect(source).toContain(
      'FUNCTION_ENDPOINT_REGISTRY_URL: https://storage.googleapis.com/irien-465710-function-endpoints/function-endpoints.json'
    );
    expect(source).toContain(
      'FUNCTION_ENDPOINT_REGISTRY_EVIDENCE_PATH: ${{ runner.temp }}/function-endpoint-registry-observation.json'
    );
    expect(verifyIndex).toBeGreaterThan(buildIndex);
    expect(deployIndex).toBeGreaterThan(verifyIndex);
    const artifactIndex = source.indexOf(
      'name: Upload function endpoint registry observation'
    );
    const attachIndex = source.indexOf(
      'node .github/scripts/attach-netlify-deployment-evidence.js'
    );
    expect(artifactIndex).toBeGreaterThan(deployIndex);
    expect(attachIndex).toBeGreaterThan(deployIndex);
    expect(artifactIndex).toBeGreaterThan(attachIndex);
    expect(source).toContain(
      'netlify deploy --prod --dir=public --message "GitHub ${{ github.sha }}" --json > "$RUNNER_TEMP/netlify-deployment.json"'
    );
    expect(source).toContain(
      '"$RUNNER_TEMP/netlify-deployment.json" "$RUNNER_TEMP/function-endpoint-registry-observation.json"'
    );
    expect(source).toContain('name: function-endpoint-registry-observation');
    expect(source).toContain(
      'path: ${{ runner.temp }}/function-endpoint-registry-observation.json'
    );
    expect(source).toContain(
      `grep -Eq 'data-search-endpoint="https://[^"]+"' "$PAGE"`
    );
  });

  it('preserves main push and manual triggers without Actions artifact access', () => {
    expect(source).toContain(
      'run: node .github/scripts/fetch-function-endpoint-registry.js'
    );
    expect(source).toContain(
      "branches: [main]\n    paths:\n      - 'public/**'\n      - 'src/**'"
    );
    expect(source).toContain('workflow_dispatch:');
    expect(source).toContain('permissions:\n      contents: read');
    expect(source).not.toContain('      actions: read');
    expect(source).not.toContain('      actions: write');
    expect(source).not.toContain('gcp_prod_run_id');
    expect(source).not.toContain('GCP_PROD_RUN_ID');
    expect(source).not.toContain('GH_TOKEN');
    expect(source).not.toContain('gh run');
    expect(source).not.toContain('endpoint.txt');
    expect(source).not.toContain('vars.OBJECT_MINUTE_RENTAL_SEARCH_URL');
  });
});
