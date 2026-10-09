import path from 'node:path';
import { jest } from '@jest/globals';
import { createCopyCloudHandle } from '../../src/core/build/copy-cloud.js';

describe('createCopyCloudHandle', () => {
  test('builds and executes the cloud copy plan with injected adapters', async () => {
    const copied = [];
    const written = [];
    const logger = { info: jest.fn() };
    const handle = await createCopyCloudHandle({
      fileURLToPathFn: () => '/repo/src/core/build/copy-cloud.js',
      dirnameFn: path.dirname,
      pathModule: path.posix,
      fsPromisesModule: {
        readdir: async () => [],
        mkdir: async () => undefined,
        copyFile: async (source, target) => copied.push({ source, target }),
        readFile: async () => '../cloud-core.js ../allow-effects.js',
        writeFile: async (filePath, contents) =>
          written.push({ filePath, contents }),
      },
      logger,
    });

    expect(handle).toBeUndefined();
    expect(copied.length).toBeGreaterThan(20);
    expect(copied).toContainEqual({
      source: '/repo/src/cloud/allow-effects.js',
      target: '/repo/infra/cloud-functions/submit-new-story/allow-effects.js',
    });
    expect(copied).toContainEqual({
      source: '/repo/src/cloud/allow-effects.js',
      target: '/repo/infra/cloud-functions/submit-new-page/allow-effects.js',
    });
    expect(copied).toContainEqual({
      source: '/repo/src/browser/allow-effects.js',
      target: '/repo/infra/allow-effects.js',
    });
    expect(copied).toContainEqual({
      source: '/repo/src/adapters/allow-effects.js',
      target:
        '/repo/infra/cloud-functions/submit-new-story/adapters/allow-effects.js',
    });
    expect(
      written.some(({ contents }) => contents.includes('./allow-effects.js'))
    ).toBe(true);
    expect(
      written
        .filter(
          ({ filePath }) =>
            filePath === '/repo/infra/cloud-functions/submit-new-story/index.js'
        )
        .some(({ contents }) => contents.includes('../allow-effects.js'))
    ).toBe(false);
    expect(written.length).toBeGreaterThan(0);
    expect(logger.info).toHaveBeenCalled();
  });

  test('uses console logging when no logger is injected', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await createCopyCloudHandle({
        fileURLToPathFn: () => '/repo/src/core/build/copy-cloud.js',
        dirnameFn: path.dirname,
        pathModule: path.posix,
        fsPromisesModule: {
          readdir: async () => [],
          mkdir: async () => undefined,
          copyFile: async () => {},
          readFile: async () => '../cloud-core.js',
          writeFile: async () => {},
        },
      });
      expect(log).toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
});
