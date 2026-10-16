import { readFile } from 'node:fs/promises';

import { describe, expect, it } from '@jest/globals';

describe('Terraform validation workflow', () => {
  it('builds generated packages and validates without remote state or apply', async () => {
    const workflow = await readFile(
      '.github/workflows/terraform-validate.yml',
      'utf8'
    );

    expect(workflow).toContain('npm run build:cloud');
    expect(workflow).toContain('terraform init -backend=false -input=false');
    expect(workflow).toContain('terraform validate -no-color');
    expect(workflow).not.toContain('terraform apply');
    expect(workflow).not.toContain('terraform init -migrate-state');
  });
});
