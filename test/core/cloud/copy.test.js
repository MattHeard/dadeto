import path from 'path';
import { jest } from '@jest/globals';
import { createCopyToInfraCore } from '../../../src/core/cloud/copy.js';

const pathDeps = {
  join: path.posix.join,
  dirname: path.posix.dirname,
  relative: path.posix.relative,
  extname: path.posix.extname,
};

const projectRoot = '/virtual/project';

/**
 * Create a minimal Dirent-like stub for testing.
 * @param {string} name - Entry name to expose from the stub.
 * @param {boolean} isFile - Whether the entry should behave like a file.
 * @returns {{ name: string, isFile: () => boolean }} A Dirent-compatible stub.
 */
function makeDirent(name, isFile) {
  return {
    name,
    isFile: () => isFile,
  };
}

describe('createCopyToInfraCore', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Build the copy helpers with shared dependencies for the tests.
   * @param {{ copyableExtensions?: string[] }} [overrides] - Factory override options.
   * @returns {object} Helpers returned by the factory under test.
   */
  function createCore(overrides = {}) {
    return createCopyToInfraCore({
      projectRoot,
      path: pathDeps,
      ...overrides,
    });
  }

  it('uses default copyable extensions when none are provided', () => {
    const { isCopyableFile } = createCore();

    expect(isCopyableFile(makeDirent('handler.js', true))).toBe(true);
    expect(isCopyableFile(makeDirent('config.json', true))).toBe(true);
  });

  it('allows overriding the list of copyable extensions', () => {
    const { isCopyableFile } = createCore({ copyableExtensions: ['.txt'] });

    expect(isCopyableFile(makeDirent('notes.txt', true))).toBe(true);
    expect(isCopyableFile(makeDirent('handler.js', true))).toBe(false);
  });

  it('ignores entries that are not regular files', () => {
    const { isCopyableFile } = createCore();

    expect(isCopyableFile(makeDirent('functions', false))).toBe(false);
  });

  it('formats paths relative to the project root for logging', () => {
    const { formatPathForLog } = createCore();
    const relativeTarget = `${projectRoot}/functions/index.js`;
    const outsideTarget = '/outside/project/file.js';

    expect(formatPathForLog(projectRoot)).toBe('.');
    expect(formatPathForLog(relativeTarget)).toBe('functions/index.js');
    expect(formatPathForLog(outsideTarget)).toBe(outsideTarget);
  });

  it('copies an individual file and logs the operation', async () => {
    const { copyFileToTarget } = createCore();
    const io = {
      copyFile: jest.fn().mockResolvedValue(undefined),
    };
    const messageLogger = { info: jest.fn() };

    await copyFileToTarget(
      io,
      `${projectRoot}/functions`,
      `${projectRoot}/infra`,
      'index.js',
      messageLogger
    );

    expect(io.copyFile).toHaveBeenCalledWith(
      `${projectRoot}/functions/index.js`,
      `${projectRoot}/infra/index.js`
    );
    expect(messageLogger.info).toHaveBeenCalledWith(
      'Copied: functions/index.js -> infra/index.js'
    );
  });

  it('copies only supported files from a directory', async () => {
    const { copyDirectory } = createCore();
    const io = {
      ensureDirectory: jest.fn().mockResolvedValue(undefined),
      readDirEntries: jest
        .fn()
        .mockResolvedValue([
          makeDirent('index.js', true),
          makeDirent('config.json', true),
          makeDirent('README.md', true),
          makeDirent('subdir', false),
        ]),
      copyFile: jest.fn().mockResolvedValue(undefined),
    };
    const messageLogger = { info: jest.fn() };

    await copyDirectory(
      { source: `${projectRoot}/functions`, target: `${projectRoot}/infra` },
      io,
      messageLogger
    );

    expect(io.ensureDirectory).toHaveBeenCalledWith(`${projectRoot}/infra`);
    expect(io.copyFile).toHaveBeenCalledTimes(2);
    expect(io.copyFile).toHaveBeenCalledWith(
      `${projectRoot}/functions/index.js`,
      `${projectRoot}/infra/index.js`
    );
    expect(io.copyFile).toHaveBeenCalledWith(
      `${projectRoot}/functions/config.json`,
      `${projectRoot}/infra/config.json`
    );
    expect(messageLogger.info).toHaveBeenCalledTimes(2);
  });

  it('copies declared files into a directory', async () => {
    const { copyDeclaredFiles } = createCore();
    const io = {
      ensureDirectory: jest.fn().mockResolvedValue(undefined),
      copyFile: jest.fn().mockResolvedValue(undefined),
    };
    const messageLogger = { info: jest.fn() };

    await copyDeclaredFiles(
      {
        sourceDir: `${projectRoot}/functions`,
        targetDir: `${projectRoot}/infra/configs`,
        files: ['config.json', 'schema.js'],
      },
      io,
      messageLogger
    );

    expect(io.ensureDirectory).toHaveBeenCalledWith(
      `${projectRoot}/infra/configs`
    );
    expect(io.copyFile).toHaveBeenCalledTimes(2);
    expect(io.copyFile).toHaveBeenCalledWith(
      `${projectRoot}/functions/config.json`,
      `${projectRoot}/infra/configs/config.json`
    );
    expect(io.copyFile).toHaveBeenCalledWith(
      `${projectRoot}/functions/schema.js`,
      `${projectRoot}/infra/configs/schema.js`
    );
    expect(messageLogger.info).toHaveBeenCalledTimes(2);
  });

  it('copies individual files and prepares their destination directories', async () => {
    const { copyIndividualFiles } = createCore();
    const io = {
      ensureDirectory: jest.fn().mockResolvedValue(undefined),
      copyFile: jest.fn().mockResolvedValue(undefined),
    };
    const messageLogger = { info: jest.fn() };
    const copies = [
      {
        source: `${projectRoot}/functions/index.js`,
        target: `${projectRoot}/infra/index.js`,
      },
      {
        source: `${projectRoot}/functions/utils/helper.json`,
        target: `${projectRoot}/infra/utils/helper.json`,
      },
    ];

    await copyIndividualFiles(copies, io, messageLogger);

    expect(io.ensureDirectory).toHaveBeenCalledWith(`${projectRoot}/infra`);
    expect(io.ensureDirectory).toHaveBeenCalledWith(
      `${projectRoot}/infra/utils`
    );
    expect(io.copyFile).toHaveBeenCalledWith(
      `${projectRoot}/functions/index.js`,
      `${projectRoot}/infra/index.js`
    );
    expect(io.copyFile).toHaveBeenCalledWith(
      `${projectRoot}/functions/utils/helper.json`,
      `${projectRoot}/infra/utils/helper.json`
    );
    expect(messageLogger.info).toHaveBeenCalledTimes(2);
  });

  it('runs the copy workflow without optional sections', async () => {
    const { runCopyToInfra } = createCore();
    const io = {
      ensureDirectory: jest.fn().mockResolvedValue(undefined),
      readDirEntries: jest.fn().mockResolvedValue([]),
      copyFile: jest.fn().mockResolvedValue(undefined),
    };
    const messageLogger = { info: jest.fn() };

    await runCopyToInfra({
      directoryCopies: [
        { source: `${projectRoot}/functions`, target: `${projectRoot}/infra` },
      ],
      io,
      messageLogger,
    });

    expect(io.ensureDirectory).toHaveBeenCalledWith(`${projectRoot}/infra`);
    expect(io.readDirEntries).toHaveBeenCalledWith(`${projectRoot}/functions`);
    expect(io.copyFile).not.toHaveBeenCalled();
    expect(messageLogger.info).not.toHaveBeenCalled();
  });

  it('runs the copy workflow with declared and individual file copies', async () => {
    const { runCopyToInfra } = createCore();
    const io = {
      ensureDirectory: jest.fn().mockResolvedValue(undefined),
      readDirEntries: jest.fn(),
      copyFile: jest.fn().mockResolvedValue(undefined),
    };
    const messageLogger = { info: jest.fn() };
    const fileCopies = {
      sourceDir: `${projectRoot}/functions`,
      targetDir: `${projectRoot}/infra/configs`,
      files: ['config.json'],
    };
    const individualFileCopies = [
      {
        source: `${projectRoot}/functions/direct.js`,
        target: `${projectRoot}/infra/direct.js`,
      },
    ];

    await runCopyToInfra({
      directoryCopies: [],
      fileCopies,
      individualFileCopies,
      io,
      messageLogger,
    });

    expect(io.ensureDirectory).toHaveBeenCalledWith(
      `${projectRoot}/infra/configs`
    );
    expect(io.ensureDirectory).toHaveBeenCalledWith(`${projectRoot}/infra`);
    expect(io.copyFile).toHaveBeenCalledWith(
      `${projectRoot}/functions/config.json`,
      `${projectRoot}/infra/configs/config.json`
    );
    expect(io.copyFile).toHaveBeenCalledWith(
      `${projectRoot}/functions/direct.js`,
      `${projectRoot}/infra/direct.js`
    );
    expect(messageLogger.info).toHaveBeenCalledWith(
      'Copied: functions/direct.js -> infra/direct.js'
    );
  });
});
