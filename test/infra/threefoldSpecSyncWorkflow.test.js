import { readFile } from 'node:fs/promises';

import { describe, expect, it } from '@jest/globals';

describe('THREEFOLD spec drift check workflow', () => {
  it('requires the read-only Notion token and runs the drift check without a skip', async () => {
    const workflow = await readFile('.github/workflows/check.yml', 'utf8');
    const step = workflow.match(
      /- name: Check generated THREEFOLD spec([\s\S]*?)(?=\n      - name:|$)/
    )?.[1];

    expect(step).toBeDefined();
    expect(step).toContain(
      'NOTION_THREEFOLD_SPEC_READ_TOKEN: ${{ secrets.NOTION_THREEFOLD_SPEC_READ_TOKEN }}'
    );
    expect(step).toContain('npm run threefold:spec:check');
    expect(step).not.toContain('continue-on-error');
    expect(step).not.toContain('if:');
  });
});
