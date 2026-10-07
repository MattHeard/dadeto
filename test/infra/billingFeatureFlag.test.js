import { readFile } from 'node:fs/promises';

describe('billing feature flag infrastructure', () => {
  it('defaults billing off and injects the explicit setting into cloud functions', async () => {
    const [variables, main] = await Promise.all([
      readFile('infra/variables.tf', 'utf8'),
      readFile('infra/main.tf', 'utf8'),
    ]);

    expect(variables).toMatch(
      /variable "billing_enabled"\s*\{[^}]*default\s*=\s*false/s
    );
    expect(main).toContain(
      'BILLING_ENABLED      = tostring(var.billing_enabled)'
    );
  });
});
