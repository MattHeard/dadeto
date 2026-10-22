import { execFileSync } from 'node:child_process';
import {
  copyFile as copyFileActual,
  mkdir as mkdirActual,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jest } from '@jest/globals';
import { createCopyCloudHandle } from '../../../src/core/build/copy-cloud.js';

const rootBrowserWrappers = [
  {
    name: 'admin-core.js',
    contents: "export * from '../core/browser/admin-core.js';\n",
  },
  {
    name: 'load-static-config-core.js',
    contents: "export * from '../core/browser/load-static-config-core.js';\n",
  },
  {
    name: 'logging.js',
    contents: "export * from '../core/browser/browser-core.js';\n",
  },
];
const googleAuthObjectNames = [
  'contentsGoogleAuthModule.js',
  'statsGoogleAuthModule.js',
  'variantGoogleSignIn.js',
];

/**
 * Run the cloud copy workflow against an isolated project tree.
 * @param {{missingSource?: string}} [options] Optional source wrapper to omit.
 * @returns {Promise<string>} Path to the temporary project root.
 */
async function runRootBrowserWrapperCopyFixture(options = {}) {
  const { missingSource } = options;
  const projectRoot = await mkdtemp(
    path.join(tmpdir(), 'dadeto-cloud-wrapper-copy-')
  );
  const browserSourceDir = path.join(projectRoot, 'src/browser');
  await mkdirActual(browserSourceDir, { recursive: true });

  for (const { name, contents } of rootBrowserWrappers) {
    if (name !== missingSource) {
      await writeFile(path.join(browserSourceDir, name), contents);
    }
  }

  const selectedSources = new Set(
    rootBrowserWrappers.map(({ name }) => path.join(browserSourceDir, name))
  );
  const fsPromisesModule = {
    readdir: async () => [],
    mkdir: mkdirActual,
    copyFile: async (source, target) => {
      if (selectedSources.has(source)) {
        await copyFileActual(source, target);
      }
    },
    readFile: async () => {
      const error = new Error('fixture file is absent');
      error.code = 'ENOENT';
      throw error;
    },
    writeFile: async () => undefined,
  };

  try {
    await createCopyCloudHandle({
      fileURLToPathFn: () =>
        path.join(projectRoot, 'src/core/build/copy-cloud.js'),
      dirnameFn: path.dirname,
      pathModule: path,
      fsPromisesModule,
    });
  } catch (error) {
    await rm(projectRoot, { recursive: true, force: true });
    throw error;
  }

  return projectRoot;
}

/**
 * Run the cloud copy workflow with real Google-auth source files in a fixture.
 * @param {{missingSource?: string}} [options] Optional auth module to omit.
 * @returns {Promise<string>} Path to the temporary project root.
 */
async function runGoogleAuthObjectCopyFixture(options = {}) {
  const { missingSource } = options;
  const projectRoot = await mkdtemp(
    path.join(tmpdir(), 'dadeto-google-auth-copy-')
  );
  const browserSourceDir = path.join(projectRoot, 'src/browser');
  const repositoryRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../..'
  );
  await mkdirActual(browserSourceDir, { recursive: true });

  for (const name of googleAuthObjectNames) {
    if (name === missingSource) continue;
    await copyFileActual(
      path.join(repositoryRoot, 'src/browser', name),
      path.join(browserSourceDir, name)
    );
  }

  const selectedSources = new Set(
    googleAuthObjectNames.map(name => path.join(browserSourceDir, name))
  );
  const fsPromisesModule = {
    readdir: async () => [],
    mkdir: mkdirActual,
    copyFile: async (source, target) => {
      if (selectedSources.has(source)) {
        await copyFileActual(source, target);
      }
    },
    readFile: async () => {
      const error = new Error('fixture file is absent');
      error.code = 'ENOENT';
      throw error;
    },
    writeFile: async () => undefined,
  };

  try {
    await createCopyCloudHandle({
      fileURLToPathFn: () =>
        path.join(projectRoot, 'src/core/build/copy-cloud.js'),
      dirnameFn: path.dirname,
      pathModule: path,
      fsPromisesModule,
    });
  } catch (error) {
    await rm(projectRoot, { recursive: true, force: true });
    throw error;
  }

  return projectRoot;
}

describe('createCopyCloudHandle', () => {
  test('runs the injected cloud copy workflow', async () => {
    const writes = [];
    const copies = [];
    const fsPromises = {
      readdir: async () => [],
      mkdir: async () => undefined,
      copyFile: async (source, target) => copies.push({ source, target }),
      readFile: async () => '../cloud-core.js',
      writeFile: async (filePath, content) =>
        writes.push({ filePath, content }),
    };
    const logger = { info: jest.fn() };

    await createCopyCloudHandle({
      fileURLToPathFn: () => '/repo/src/core/build/copy-cloud.js',
      dirnameFn: input => path.dirname(input),
      pathModule: path,
      fsPromisesModule: fsPromises,
      logger,
    });

    expect(writes.length).toBeGreaterThan(20);
    expect(copies).toContainEqual({
      source: '/repo/src/core/wgs84.js',
      target:
        '/repo/infra/cloud-functions/object-minute-rental-search/core/wgs84.js',
    });
    expect(copies).toContainEqual({
      source: '/repo/src/core/submit-shared.js',
      target:
        '/repo/infra/cloud-functions/get-author-uuid-v2/core/submit-shared.js',
    });
    expect(copies).toContainEqual({
      source: '/repo/src/browser/admin-core.js',
      target: '/repo/infra/admin-core.js',
    });
    expect(copies).toContainEqual({
      source: '/repo/src/browser/load-static-config-core.js',
      target: '/repo/infra/load-static-config-core.js',
    });
    expect(copies).toContainEqual({
      source: '/repo/src/browser/logging.js',
      target: '/repo/infra/logging.js',
    });
    for (const filename of ['index.js', 'wgs84.js']) {
      expect(copies).toContainEqual({
        source: `/repo/src/core/wgs84/${filename}`,
        target: `/repo/infra/cloud-functions/object-minute-rental-search/core/wgs84/${filename}`,
      });
    }
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Rewrote')
    );

    await createCopyCloudHandle({
      fileURLToPathFn: () => '/repo/src/core/build/copy-cloud.js',
      dirnameFn: input => path.dirname(input),
      pathModule: path,
      fsPromisesModule: {
        ...fsPromises,
        readFile: async () => '',
      },
    });

    const missingFile = Object.assign({}, fsPromises, {
      readFile: async () => {
        const error = new Error('missing');
        error.code = 'ENOENT';
        throw error;
      },
    });
    await createCopyCloudHandle({
      fileURLToPathFn: () => '/repo/src/core/build/copy-cloud.js',
      dirnameFn: input => path.dirname(input),
      pathModule: path,
      fsPromisesModule: missingFile,
      logger,
    });

    let readCount = 0;
    const brokenFile = Object.assign({}, fsPromises, {
      readFile: async () => {
        readCount += 1;
        if (readCount < 211) return '';
        throw new Error('read failure');
      },
    });
    await expect(
      createCopyCloudHandle({
        fileURLToPathFn: () => '/repo/src/core/build/copy-cloud.js',
        dirnameFn: input => path.dirname(input),
        pathModule: path,
        fsPromisesModule: brokenFile,
        logger,
      })
    ).rejects.toThrow('read failure');

    await expect(
      createCopyCloudHandle({
        fileURLToPathFn: () => '/repo/src/core/build/copy-cloud.js',
        dirnameFn: input => path.dirname(input),
        pathModule: path,
        fsPromisesModule: {
          ...fsPromises,
          readFile: async () => {
            throw new Error('batch read failure');
          },
        },
        logger,
      })
    ).rejects.toThrow('batch read failure');

    await expect(
      createCopyCloudHandle({
        fileURLToPathFn: () => '/repo/src/core/build/copy-cloud.js',
        dirnameFn: input => path.dirname(input),
        pathModule: path,
        fsPromisesModule: {
          ...fsPromises,
          readFile: async filePath => {
            if (
              String(filePath).includes(
                'generate-stats/mark-variant-dirty-verifyAdmin.js'
              )
            ) {
              const error = new Error('rewrite failure');
              error.code = 'EIO';
              throw error;
            }
            return '../cloud-core.js';
          },
        },
        logger,
      })
    ).rejects.toThrow('rewrite failure');
  });

  test('writes root browser wrappers into a temporary deployment tree', async () => {
    const projectRoot = await runRootBrowserWrapperCopyFixture();

    try {
      for (const { name, contents } of rootBrowserWrappers) {
        await expect(
          readFile(path.join(projectRoot, 'infra', name), 'utf8')
        ).resolves.toBe(contents);
      }
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  test('fails when a root browser wrapper source is missing', async () => {
    await expect(
      runRootBrowserWrapperCopyFixture({ missingSource: 'logging.js' })
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('writes Google-auth GCS object files byte-for-byte in a temporary tree', async () => {
    const projectRoot = await runGoogleAuthObjectCopyFixture();
    const repositoryRoot = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../..'
    );

    try {
      for (const name of googleAuthObjectNames) {
        const expected = await readFile(
          path.join(repositoryRoot, 'src/browser', name),
          'utf8'
        );
        await expect(
          readFile(path.join(projectRoot, 'infra', name), 'utf8')
        ).resolves.toBe(expected);
      }
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  test('fails when a Google-auth GCS object source is missing', async () => {
    await expect(
      runGoogleAuthObjectCopyFixture({
        missingSource: 'statsGoogleAuthModule.js',
      })
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('runs source contracts with generated infra wrappers absent', async () => {
    const projectRoot = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../..'
    );
    const fixtureRoot = await mkdtemp(
      path.join(tmpdir(), 'dadeto-clean-checkout-')
    );

    try {
      await mkdirActual(path.join(fixtureRoot, 'infra'), { recursive: true });
      await mkdirActual(path.join(fixtureRoot, 'test/infra'), {
        recursive: true,
      });
      for (const filename of [
        'admin.html',
        'functions-v2.tf',
        'load-balancer.tf',
        'main.tf',
      ]) {
        await copyFileActual(
          path.join(projectRoot, 'infra', filename),
          path.join(fixtureRoot, 'infra', filename)
        );
      }
      for (const filename of [
        'babel.config.cjs',
        'jest.config.mjs',
        'package.json',
      ]) {
        await copyFileActual(
          path.join(projectRoot, filename),
          path.join(fixtureRoot, filename)
        );
      }
      await copyFileActual(
        path.join(projectRoot, 'test/infra/cloudBrowserEntrypoints.test.js'),
        path.join(fixtureRoot, 'test/infra/cloudBrowserEntrypoints.test.js')
      );
      await copyFileActual(
        path.join(projectRoot, 'test/infra/googleAuthEntrypoints.test.js'),
        path.join(fixtureRoot, 'test/infra/googleAuthEntrypoints.test.js')
      );
      await symlink(
        path.join(projectRoot, 'src'),
        path.join(fixtureRoot, 'src'),
        'dir'
      );
      await symlink(
        path.join(projectRoot, 'node_modules'),
        path.join(fixtureRoot, 'node_modules'),
        'dir'
      );

      for (const { name } of rootBrowserWrappers) {
        await expect(
          readFile(path.join(fixtureRoot, 'infra', name), 'utf8')
        ).rejects.toMatchObject({ code: 'ENOENT' });
      }
      for (const name of googleAuthObjectNames) {
        await expect(
          readFile(path.join(fixtureRoot, 'infra', name), 'utf8')
        ).rejects.toMatchObject({ code: 'ENOENT' });
      }

      const args = [
        '--experimental-vm-modules',
        path.join(projectRoot, 'node_modules/.bin/jest'),
        '--config',
        path.join(fixtureRoot, 'jest.config.mjs'),
        '--runInBand',
        '--coverage=false',
        '--watchman=false',
        '--runTestsByPath',
        path.join(fixtureRoot, 'test/infra/cloudBrowserEntrypoints.test.js'),
        path.join(fixtureRoot, 'test/infra/googleAuthEntrypoints.test.js'),
      ];
      const runContractSuite = () =>
        runContractSuiteWithDiagnostics(args, fixtureRoot);

      expect(runContractSuite).not.toThrow();

      const contractTestPath = path.join(
        fixtureRoot,
        'test/infra/cloudBrowserEntrypoints.test.js'
      );
      const contractTestSource = await readFile(contractTestPath, 'utf8');
      const finalDescribeClose = contractTestSource.lastIndexOf('\n});');
      expect(finalDescribeClose).toBeGreaterThanOrEqual(0);
      await writeFile(
        contractTestPath,
        `${contractTestSource.slice(0, finalDescribeClose)}\n  it('fails when a generated wrapper is read', async () => {\n    await readFile('infra/admin-core.js', 'utf8');\n  });${contractTestSource.slice(finalDescribeClose)}`
      );

      expect(runContractSuite).toThrow();

      const googleAuthContractTestPath = path.join(
        fixtureRoot,
        'test/infra/googleAuthEntrypoints.test.js'
      );
      const googleAuthContractTestSource = await readFile(
        googleAuthContractTestPath,
        'utf8'
      );
      const finalGoogleAuthDescribeClose =
        googleAuthContractTestSource.lastIndexOf('\n});');
      expect(finalGoogleAuthDescribeClose).toBeGreaterThanOrEqual(0);
      await writeFile(
        googleAuthContractTestPath,
        `${googleAuthContractTestSource.slice(0, finalGoogleAuthDescribeClose)}\n  it('fails when a generated GCS object is read', () => {\n    readFileSync('infra/contentsGoogleAuthModule.js', 'utf8');\n  });${googleAuthContractTestSource.slice(finalGoogleAuthDescribeClose)}`
      );

      expect(runContractSuite).toThrow();
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });
});

/**
 * Run the isolated source contracts and retain subprocess diagnostics on failure.
 * @param {string[]} args Jest arguments for the copied checkout.
 * @param {string} cwd Copied checkout root.
 * @returns {void} Completes only when every contract passes.
 */
function runContractSuiteWithDiagnostics(args, cwd) {
  try {
    execFileSync(process.execPath, args, {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 60_000,
    });
  } catch (error) {
    const diagnostics = [error.stdout, error.stderr]
      .map(output => (Buffer.isBuffer(output) ? output.toString() : output))
      .filter(Boolean)
      .join('\n');
    throw new Error([error.message, diagnostics].filter(Boolean).join('\n'), {
      cause: error,
    });
  }
}
