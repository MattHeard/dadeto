import { readFile } from 'node:fs/promises';

import { describe, expect, it } from '@jest/globals';

describe('cloud browser entrypoints', () => {
  it('targets the exported cloud function handles used by src/cloud entrypoints', async () => {
    const mainTf = await readFile('infra/main.tf', 'utf8');

    for (const legacyEntryPoint of [
      'submitNewStory',
      'submitNewPage',
      'realtimeCall',
      'assignModerationJob',
      'getModerationVariant',
      'submitModerationRating',
      'reportForModeration',
      'processNewStory',
      'updateVariantVisibility',
      'processNewPage',
      'renderVariant',
      'hideVariantHtml',
      'markVariantDirty',
      'generateStats',
      'renderContents',
      'triggerRenderContents',
    ]) {
      expect(mainTf).not.toContain(
        `entry_point                  = "${legacyEntryPoint}"`
      );
      expect(mainTf).not.toContain(`entry_point = "${legacyEntryPoint}"`);
    }

    expect(mainTf).toContain('entry_point                  = "handler"');
    expect(mainTf).toContain('entry_point                  = "handleTrigger"');
  });

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

  it('targets the v2 API key function at the exported handle entrypoint', async () => {
    const functionsV2Tf = await readFile('infra/functions-v2.tf', 'utf8');

    expect(functionsV2Tf).toContain('entry_point = "handle"');
    expect(functionsV2Tf).not.toContain('entry_point = "getApiKeyCreditV2"');
  });

  it('copies and uploads the deep core browser module tree used by root wrappers', async () => {
    const [copyCloudJs, mainTf, loadBalancerTf] = await Promise.all([
      readFile('src/core/build/copy-cloud.js', 'utf8'),
      readFile('infra/main.tf', 'utf8'),
      readFile('infra/load-balancer.tf', 'utf8'),
    ]);

    expect(copyCloudJs).toContain("target: join(infraDir, 'core', 'browser')");
    expect(copyCloudJs).toContain(
      "target: join(infraDir, 'core', 'commonCore.js')"
    );
    expect(copyCloudJs).toContain(
      "target: join(infraDir, 'core', 'express-app.js')"
    );
    expect(copyCloudJs).toMatch(
      /target:\s+join\(\s*infraFunctionsDir,\s*'generate-stats',\s*'core',\s*'express-app\.js'\s*\)/
    );
    expect(mainTf).toContain(
      'resource "google_storage_bucket_object" "dendrite_core_files"'
    );
    expect(mainTf).toContain('fileset("${path.module}/core", "**")');
    expect(loadBalancerTf).toContain(
      'Cross-Origin-Opener-Policy: same-origin-allow-popups'
    );
  });

  it('keeps the root logging wrapper pointed at the uploaded core tree', async () => {
    await expect(readFile('infra/logging.js', 'utf8')).resolves.toBe(
      "export * from '../core/browser/browser-core.js';\n"
    );
  });
});
