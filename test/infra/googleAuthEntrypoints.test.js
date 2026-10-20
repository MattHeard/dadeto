import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from '@jest/globals';

const entrypointNames = [
  'contentsGoogleAuthModule.js',
  'statsGoogleAuthModule.js',
  'variantGoogleSignIn.js',
];

const readEntrypoint = (directory, name) =>
  readFileSync(resolve(process.cwd(), directory, name), 'utf8');

describe('Google auth status entrypoint compatibility', () => {
  it.each(entrypointNames)(
    '%s uses the options-object call in source',
    name => {
      const source = readEntrypoint('src/browser', name);

      expect(source).toContain('createGoogleAuthStatusHandle({');
      expect(source).toContain('documentObj: document');
      expect(source).toContain('GOOGLE_AUTH_STATUS_ASSET_VERSION');
      expect(source).toContain(
        "statusModuleUrl.searchParams.set('v', GOOGLE_AUTH_STATUS_ASSET_VERSION)"
      );
      expect(source).toContain('await import(statusModuleUrl.href)');
    }
  );

  it('sets no-store on every mutable Google-auth asset in Terraform', () => {
    const terraformMain = readEntrypoint('infra', 'main.tf');
    const staticObjectBlock = key => {
      const start = terraformMain.indexOf(`${key} = {`);
      const end = terraformMain.indexOf('\n    }', start);
      return terraformMain.slice(start, end);
    };

    for (const key of [
      'dendrite_google_auth_js',
      'dendrite_contents_google_auth_module_js',
      'dendrite_stats_google_auth_module_js',
      'dendrite_variant_google_sign_in_js',
    ]) {
      expect(staticObjectBlock(key)).toContain('cache_control = "no-store"');
    }
    expect(terraformMain).toContain('"browser/google-auth-status.js"');
    expect(terraformMain).toContain('"google-auth-status-asset-version.js"');
    expect(terraformMain).toContain('"variantGoogleSignIn.js",');
    expect(terraformMain).toContain('"statsGoogleAuthModule.js",');
    expect(terraformMain).toContain('"contentsGoogleAuthModule.js",');
    for (const name of entrypointNames) {
      expect(terraformMain).toContain(
        `source        = "\${path.module}/${name}"`
      );
    }
  });
});
