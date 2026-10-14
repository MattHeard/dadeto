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
});
