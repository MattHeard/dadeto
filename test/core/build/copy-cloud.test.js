import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { jest } from '@jest/globals';
import { createCopyCloudHandle } from '../../../src/core/build/copy-cloud.js';

describe('createCopyCloudHandle', () => {
  it('copies the shared browser moderation file from src/core/browser', async () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const projectRoot = path.resolve(__dirname, '../../..');
    const sourcePath = path.resolve(
      projectRoot,
      'src/core/browser/moderation/authedFetch.js'
    );

    const copyFile = jest.fn(async () => {});
    const readFile = jest.fn(async () => '');
    const writeFile = jest.fn(async () => {});

    await createCopyCloudHandle({
      fileURLToPathFn: fileURLToPath,
      dirnameFn: path.dirname,
      pathModule: path,
      fsPromisesModule: {
        readdir: async () => [],
        mkdir: async () => {},
        copyFile,
        readFile,
        writeFile,
      },
      logger: { info: jest.fn() },
    });

    expect(copyFile).toHaveBeenCalledWith(
      sourcePath,
      path.resolve(projectRoot, 'infra/core/browser/moderation/authedFetch.js')
    );
  });

  it('keeps firestore helpers distinct from the generated firestore module', async () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const projectRoot = path.resolve(__dirname, '../../..');

    const copyFile = jest.fn(async () => {});
    const readFile = jest.fn(async () => '');
    const writeFile = jest.fn(async () => {});

    await createCopyCloudHandle({
      fileURLToPathFn: fileURLToPath,
      dirnameFn: path.dirname,
      pathModule: path,
      fsPromisesModule: {
        readdir: async () => [],
        mkdir: async () => {},
        copyFile,
        readFile,
        writeFile,
      },
      logger: { info: jest.fn() },
    });

    expect(copyFile).toHaveBeenCalledWith(
      path.resolve(projectRoot, 'src/cloud/firestore.js'),
      path.resolve(
        projectRoot,
        'infra/cloud-functions/submit-new-story/firestore.js'
      )
    );
    expect(copyFile).toHaveBeenCalledWith(
      path.resolve(projectRoot, 'src/core/cloud/firestore-helpers.js'),
      path.resolve(
        projectRoot,
        'infra/cloud-functions/submit-new-story/core/cloud/firestore-helpers.js'
      )
    );
  });

  it('copies the shared error-reporting helper into the cloud function bundle', async () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const projectRoot = path.resolve(__dirname, '../../..');
    const sourcePath = path.resolve(projectRoot, 'src/core/error-reporting.js');

    const copyFile = jest.fn(async () => {});
    const readFile = jest.fn(async () => '');
    const writeFile = jest.fn(async () => {});

    await createCopyCloudHandle({
      fileURLToPathFn: fileURLToPath,
      dirnameFn: path.dirname,
      pathModule: path,
      fsPromisesModule: {
        readdir: async () => [],
        mkdir: async () => {},
        copyFile,
        readFile,
        writeFile,
      },
      logger: { info: jest.fn() },
    });

    expect(copyFile).toHaveBeenCalledWith(
      sourcePath,
      path.resolve(
        projectRoot,
        'infra/cloud-functions/errors/core/error-reporting.js'
      )
    );
    expect(copyFile).toHaveBeenCalledWith(
      sourcePath,
      path.resolve(projectRoot, 'infra/core/error-reporting.js')
    );
  });
});
