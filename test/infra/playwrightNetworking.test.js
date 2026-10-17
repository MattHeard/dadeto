import { readFile } from 'node:fs/promises';

import { describe, expect, it } from '@jest/globals';

describe('Playwright cloud networking', () => {
  it('grants Terraform network roles only for Playwright environments', async () => {
    const [playwrightTf, mainTf] = await Promise.all([
      readFile('infra/playwright.tf', 'utf8'),
      readFile('infra/main.tf', 'utf8'),
    ]);

    expect(playwrightTf).toMatch(
      /resource "google_cloud_run_v2_service" "gcs_proxy" \{\s+count = local\.playwright_enabled \? 1 : 0/
    );
    expect(mainTf).toContain(
      'for_each = local.playwright_enabled ? local.terraform_networking_roles : {}'
    );
  });

  it('uses direct Cloud Run VPC interfaces instead of Serverless VPC Access connectors', async () => {
    const [playwrightTf, variablesTf, mainTf] = await Promise.all([
      readFile('infra/playwright.tf', 'utf8'),
      readFile('infra/variables.tf', 'utf8'),
      readFile('infra/main.tf', 'utf8'),
    ]);

    expect(playwrightTf).not.toContain('google_vpc_access_connector');
    expect(playwrightTf).not.toContain('vpcaccess.googleapis.com');
    expect(variablesTf).not.toContain('playwright_vpc_connector_cidr');
    expect(mainTf).not.toContain('roles/vpcaccess.admin');
    expect(playwrightTf).toMatch(
      /google_cloud_run_v2_job" "playwright"[\s\S]*network_interfaces/
    );
  });
});
