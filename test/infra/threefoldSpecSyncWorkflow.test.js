import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

import { describe, expect, it } from '@jest/globals';

describe('THREEFOLD spec cache workflow', () => {
  it('checks the local cache in Full Check without a Notion token or API call', async () => {
    const workflow = await readFile('.github/workflows/check.yml', 'utf8');
    const step = workflow
      .split('- name: Check local THREEFOLD spec cache\n')[1]
      ?.split('\n      - name:')[0];
    const checker = await readFile(
      'src/local/check-threefold-spec-cache.js',
      'utf8'
    );
    const packageJson = JSON.parse(await readFile('package.json', 'utf8'));

    expect(step).toBeDefined();
    expect(step).toContain('npm run threefold:spec:cache:check');
    expect(step).not.toContain('NOTION_THREEFOLD_SPEC_READ_TOKEN');
    expect(step).not.toContain('threefold:spec:check');
    expect(checker.includes('process.env')).toBe(false);
    expect(checker.includes('fetch')).toBe(false);
    expect(checker.includes('sync-threefold-spec')).toBe(false);
    expect(packageJson.scripts['threefold:spec:cache:check']).toBe(
      'node src/local/check-threefold-spec-cache.js'
    );

    const output = execFileSync(
      process.execPath,
      ['src/local/check-threefold-spec-cache.js'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: { ...process.env, NOTION_THREEFOLD_SPEC_READ_TOKEN: '' },
      }
    );
    expect(output).toContain('THREEFOLD spec cache: valid.');
  });
});
