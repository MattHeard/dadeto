import { readFile } from 'node:fs/promises';

import { describe, expect, it } from '@jest/globals';

describe('cloud browser entrypoints', () => {
  it('uploads root browser wrappers instead of deep core modules', async () => {
    await expect(readFile('infra/admin-core.js', 'utf8')).resolves.toBe(
      "export * from '../core/browser/admin-core.js';\n"
    );
    await expect(
      readFile('infra/load-static-config-core.js', 'utf8')
    ).resolves.toBe(
      "export * from '../core/browser/load-static-config-core.js';\n"
    );
  });

  it('uploads the root browser modules imported by cloud HTML entrypoints', async () => {
    const mainTf = await readFile('infra/main.tf', 'utf8');

    for (const name of [
      'admin-core.js',
      'authedFetch.js',
      'document.js',
      'googleAuth.js',
      'load-static-config-core.js',
      'loadStaticConfig.js',
      'logging.js',
      'moderate.js',
      'moderation/endpoints.js',
    ]) {
      expect(mainTf).toMatch(new RegExp(`name\\s+= "${name}"`));
    }
  });

  it('copies and uploads the deep core browser module tree used by root wrappers', async () => {
    const [copyCloudJs, mainTf] = await Promise.all([
      readFile('src/build/copy-cloud.js', 'utf8'),
      readFile('infra/main.tf', 'utf8'),
    ]);

    expect(copyCloudJs).toContain("target: join(infraDir, 'core', 'browser')");
    expect(copyCloudJs).toContain(
      "target: join(infraDir, 'core', 'commonCore.js')"
    );
    expect(mainTf).toContain(
      'resource "google_storage_bucket_object" "dendrite_core_files"'
    );
    expect(mainTf).toContain('fileset("${path.module}/core", "**")');
  });

  it('keeps the root logging wrapper pointed at the uploaded core tree', async () => {
    await expect(readFile('infra/logging.js', 'utf8')).resolves.toBe(
      "export * from '../core/browser/browser-core.js';\n"
    );
  });
});
