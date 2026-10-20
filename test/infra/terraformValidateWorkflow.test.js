import { readFile } from 'node:fs/promises';

import { describe, expect, it } from '@jest/globals';

describe('Terraform validation workflow', () => {
  it('builds generated packages and validates without remote state or apply', async () => {
    const workflow = await readFile(
      '.github/workflows/terraform-validate.yml',
      'utf8'
    );

    expect(workflow).toContain('npm run build:cloud');
    expect(workflow).toContain('npm run verify:cloud-packages');
    expect(workflow).toContain("'.github/workflows/terraform-validate.yml'");
    expect(workflow).toContain("'src/local/verify-cloud-function-packages.js'");
    expect(workflow).toContain("'src/core/**'");
    expect(workflow.indexOf('npm run build:cloud')).toBeLessThan(
      workflow.indexOf('npm run verify:cloud-packages')
    );
    expect(workflow.indexOf('npm run verify:cloud-packages')).toBeLessThan(
      workflow.indexOf('terraform init -backend=false -input=false')
    );
    expect(workflow).toContain('terraform init -backend=false -input=false');
    expect(workflow).toContain('terraform validate -no-color');
    expect(workflow).not.toContain('terraform apply');
    expect(workflow).not.toContain('terraform init -migrate-state');
  });
});
