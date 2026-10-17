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
    '%s uses the options-object call in source and static deployment output',
    name => {
      const source = readEntrypoint('src/browser', name);
      const deploymentOutput = readEntrypoint('infra/browser', name);
      const gcsObjectSource = readEntrypoint('infra', name);

      expect(source).toContain('createGoogleAuthStatusHandle({');
      expect(source).toContain('documentObj: document');
      expect(deploymentOutput).toBe(source);
      expect(gcsObjectSource).toContain('createGoogleAuthStatusHandle({');
      expect(gcsObjectSource).toContain('documentObj: document');
    }
  );
});
