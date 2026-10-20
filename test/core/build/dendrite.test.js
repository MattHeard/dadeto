import { jest } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { executeCopyDendriteWorkflow } from '../../../src/core/build/dendrite.js';

describe('executeCopyDendriteWorkflow', () => {
  it('copies browser and core trees into infra using injected dependencies', () => {
    const console = {
      log: jest.fn(),
    };
    const fs = {
      existsSync: jest.fn(pathname => !pathname.includes('missing')),
      mkdirSync: jest.fn(),
      readdirSync: jest.fn(pathname => {
        if (pathname === '/project/src/browser') {
          return [
            {
              name: 'keep.js',
              isDirectory: () => false,
            },
            {
              name: 'nested',
              isDirectory: () => true,
            },
          ];
        }
        if (pathname === '/project/src/browser/nested') {
          return [
            {
              name: 'inner.js',
              isDirectory: () => false,
            },
          ];
        }
        if (pathname === '/project/src/core') {
          return [
            {
              name: 'core.js',
              isDirectory: () => false,
            },
          ];
        }
        return [];
      }),
      copyFileSync: jest.fn(),
    };
    const posix = path.posix;
    const helpers = {
      resolve: posix.resolve,
      dirname: posix.dirname,
      join: posix.join,
    };
    const fileURLToPath = jest.fn(() => '/project/src/build/dendrite.js');

    executeCopyDendriteWorkflow({
      console,
      fs,
      path: helpers,
      fileURLToPath,
      importMetaUrl: 'file:///project/src/build/dendrite.js',
    });

    expect(fileURLToPath).toHaveBeenCalledWith(
      'file:///project/src/build/dendrite.js'
    );
    expect(helpers.dirname('/project/src/build/dendrite.js')).toBe(
      '/project/src/build'
    );
    expect(helpers.resolve('/project/src/build', '../../')).toBe('/project');
    expect(console.log).toHaveBeenCalledWith(
      'Copying files for dendritestories.co.nz deployment...'
    );
    expect(fs.copyFileSync).toHaveBeenCalledWith(
      '/project/src/browser/keep.js',
      '/project/infra/browser/keep.js'
    );
    expect(fs.copyFileSync).toHaveBeenCalledWith(
      '/project/src/browser/nested/inner.js',
      '/project/infra/browser/nested/inner.js'
    );
    expect(fs.copyFileSync).toHaveBeenCalledWith(
      '/project/src/core/core.js',
      '/project/infra/core/core.js'
    );
    expect(console.log).toHaveBeenCalledWith(
      '✓ Copied browser files to infra/browser'
    );
    expect(console.log).toHaveBeenCalledWith(
      '✓ Copied core files to infra/core'
    );
    expect(console.log).toHaveBeenCalledWith(
      'Ready for Terraform deployment to GCS'
    );
  });

  it('skips missing source directories without throwing', () => {
    const console = {
      log: jest.fn(),
    };
    const fs = {
      existsSync: jest.fn(pathname => pathname !== '/project/src/browser'),
      mkdirSync: jest.fn(),
      readdirSync: jest.fn(pathname => {
        if (pathname === '/project/src/core') {
          return [
            {
              name: 'core.js',
              isDirectory: () => false,
            },
          ];
        }
        return [];
      }),
      copyFileSync: jest.fn(),
    };
    const posix = path.posix;
    const helpers = {
      resolve: posix.resolve,
      dirname: posix.dirname,
      join: posix.join,
    };

    executeCopyDendriteWorkflow({
      console,
      fs,
      path: helpers,
      fileURLToPath: jest.fn(() => '/project/src/build/dendrite.js'),
      importMetaUrl: 'file:///project/src/build/dendrite.js',
    });

    expect(fs.copyFileSync).toHaveBeenCalledWith(
      '/project/src/core/core.js',
      '/project/infra/core/core.js'
    );
    expect(fs.copyFileSync).not.toHaveBeenCalledWith(
      '/project/src/browser/keep.js',
      '/project/infra/browser/keep.js'
    );
    expect(console.log).toHaveBeenCalledWith(
      'Ready for Terraform deployment to GCS'
    );
  });

  it('creates deployment output from a clean fixture with no prior build', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dadeto-dendrite-'));
    const browserSource = path.join(root, 'src', 'browser');
    const coreSource = path.join(root, 'src', 'core');
    const browserOutput = path.join(root, 'infra', 'browser');
    const coreOutput = path.join(root, 'infra', 'core');
    const importMetaUrl = pathToFileURL(
      path.join(root, 'src', 'build', 'copy-dendrite.js')
    ).href;

    try {
      fs.mkdirSync(browserSource, { recursive: true });
      fs.mkdirSync(path.join(coreSource, 'browser'), { recursive: true });
      fs.writeFileSync(
        path.join(browserSource, 'entry.js'),
        'export const entry = true;\n'
      );
      fs.writeFileSync(
        path.join(coreSource, 'browser', 'handler.js'),
        'export const handler = true;\n'
      );

      expect(fs.existsSync(browserOutput)).toBe(false);
      expect(fs.existsSync(coreOutput)).toBe(false);

      executeCopyDendriteWorkflow({
        console: { log: jest.fn() },
        fs,
        path,
        fileURLToPath,
        importMetaUrl,
      });

      expect(
        fs.readFileSync(path.join(browserOutput, 'entry.js'), 'utf8')
      ).toBe('export const entry = true;\n');
      expect(
        fs.readFileSync(path.join(coreOutput, 'browser', 'handler.js'), 'utf8')
      ).toBe('export const handler = true;\n');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('skips absent source trees without creating deployment output', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dadeto-dendrite-'));
    const browserOutput = path.join(root, 'infra', 'browser');
    const coreOutput = path.join(root, 'infra', 'core');
    const importMetaUrl = pathToFileURL(
      path.join(root, 'src', 'build', 'copy-dendrite.js')
    ).href;

    try {
      expect(() =>
        executeCopyDendriteWorkflow({
          console: { log: jest.fn() },
          fs,
          path,
          fileURLToPath,
          importMetaUrl,
        })
      ).not.toThrow();
      expect(fs.existsSync(browserOutput)).toBe(false);
      expect(fs.existsSync(coreOutput)).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
