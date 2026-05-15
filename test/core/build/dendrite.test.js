import { jest } from '@jest/globals';
import path from 'path';
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
});
