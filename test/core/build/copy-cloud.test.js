import path from 'node:path';
import { jest } from '@jest/globals';
import { createCopyCloudHandle } from '../../../src/core/build/copy-cloud.js';

describe('createCopyCloudHandle', () => {
  test('runs the injected cloud copy workflow', async () => {
    const writes = [];
    const fsPromises = {
      readdir: async () => [],
      mkdir: async () => undefined,
      copyFile: async () => undefined,
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
});
