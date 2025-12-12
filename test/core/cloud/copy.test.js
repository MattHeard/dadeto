import { jest } from '@jest/globals';
import path from 'path';
import { createCopyToInfraCore } from '../../../src/core/cloud/copy.js';

const posix = path.posix;

const createDirent = (name, { file = true } = {}) => ({
  name,
  isFile: () => file,
  isDirectory: () => !file,
});

describe('createCopyToInfraCore', () => {
  const projectRoot = '/project';
  const core = createCopyToInfraCore({ projectRoot, path: posix });

  describe('formatPathForLog', () => {
    it("returns '.' for the project root", () => {
      expect(core.formatPathForLog(projectRoot)).toBe('.');
    });

    it('returns a relative path for files within the project', () => {
      const filePath = posix.join(projectRoot, 'functions/index.js');
      expect(core.formatPathForLog(filePath)).toBe('functions/index.js');
    });

    it('returns the original path when outside of the project', () => {
      expect(core.formatPathForLog('/elsewhere/file.js')).toBe(
        '/elsewhere/file.js'
      );
    });
  });

  describe('isCopyableFile', () => {
    it('accepts configured extensions and rejects others', () => {
      expect(core.isCopyableFile(createDirent('index.js'))).toBe(true);
      expect(core.isCopyableFile(createDirent('config.json'))).toBe(true);
      expect(core.isCopyableFile(createDirent('notes.txt'))).toBe(false);
      expect(core.isCopyableFile(createDirent('nested', { file: false }))).toBe(
        false
      );
    });
  });

  describe('copy helpers', () => {
    it('copies a single file and logs the action', async () => {
      const io = { copyFile: jest.fn().mockResolvedValue(undefined) };
      const logger = { info: jest.fn() };

      await core.copyFileToTarget({
        io,
        sourceDir: posix.join(projectRoot, 'src'),
        targetDir: posix.join(projectRoot, 'infra'),
        name: 'index.js',
        messageLogger: logger,
      });

      expect(io.copyFile).toHaveBeenCalledWith(
        posix.join(projectRoot, 'src/index.js'),
        posix.join(projectRoot, 'infra/index.js')
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Copied: src/index.js -> infra/index.js'
      );
    });

    it('copies allowed files from a directory', async () => {
      const entries = [
        createDirent('index.js'),
        createDirent('config.json'),
        createDirent('notes.txt'),
        createDirent('nested', { file: false }),
      ];
      const io = {
        ensureDirectory: jest.fn().mockResolvedValue(undefined),
        readDirEntries: jest.fn().mockResolvedValue(entries),
        copyFile: jest.fn().mockResolvedValue(undefined),
      };
      const logger = { info: jest.fn() };

      await core.copyDirectory(
        {
          source: posix.join(projectRoot, 'functions'),
          target: posix.join(projectRoot, 'infra/functions'),
        },
        io,
        logger
      );

      expect(io.ensureDirectory).toHaveBeenCalledWith(
        posix.join(projectRoot, 'infra/functions')
      );
      expect(io.readDirEntries).toHaveBeenCalledWith(
        posix.join(projectRoot, 'functions')
      );
      expect(io.copyFile).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith(
        'Copied: functions/index.js -> infra/functions/index.js'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Copied: functions/config.json -> infra/functions/config.json'
      );
    });

    it('copies a declared set of files into the target directory', async () => {
      const io = {
        ensureDirectory: jest.fn().mockResolvedValue(undefined),
        copyFile: jest.fn().mockResolvedValue(undefined),
      };
      const logger = { info: jest.fn() };

      await core.copyDeclaredFiles(
        {
          sourceDir: posix.join(projectRoot, 'src'),
          targetDir: posix.join(projectRoot, 'infra'),
          files: ['package.json', 'config.json'],
        },
        io,
        logger
      );

      expect(io.ensureDirectory).toHaveBeenCalledWith(
        posix.join(projectRoot, 'infra')
      );
      expect(io.copyFile).toHaveBeenNthCalledWith(
        1,
        posix.join(projectRoot, 'src/package.json'),
        posix.join(projectRoot, 'infra/package.json')
      );
      expect(io.copyFile).toHaveBeenNthCalledWith(
        2,
        posix.join(projectRoot, 'src/config.json'),
        posix.join(projectRoot, 'infra/config.json')
      );
    });

    it('copies explicit file pairs and ensures targets exist', async () => {
      const io = {
        ensureDirectory: jest.fn().mockResolvedValue(undefined),
        copyFile: jest.fn().mockResolvedValue(undefined),
      };
      const logger = { info: jest.fn() };

      await core.copyIndividualFiles(
        [
          {
            source: posix.join(projectRoot, 'src/index.js'),
            target: posix.join(projectRoot, 'infra/index.js'),
          },
          {
            source: posix.join(projectRoot, 'src/util.js'),
            target: posix.join(projectRoot, 'infra/nested/util.js'),
          },
        ],
        io,
        logger
      );

      expect(io.ensureDirectory).toHaveBeenNthCalledWith(
        1,
        posix.join(projectRoot, 'infra')
      );
      expect(io.ensureDirectory).toHaveBeenNthCalledWith(
        2,
        posix.join(projectRoot, 'infra/nested')
      );
      expect(io.copyFile).toHaveBeenCalledWith(
        posix.join(projectRoot, 'src/util.js'),
        posix.join(projectRoot, 'infra/nested/util.js')
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Copied: src/index.js -> infra/index.js'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Copied: src/util.js -> infra/nested/util.js'
      );
    });
  });

  describe('runCopyToInfra', () => {
    it('executes all configured copy operations', async () => {
      const io = {
        ensureDirectory: jest.fn().mockResolvedValue(undefined),
        readDirEntries: jest
          .fn()
          .mockResolvedValue([
            createDirent('index.js'),
            createDirent('README.md'),
          ]),
        copyFile: jest.fn().mockResolvedValue(undefined),
      };
      const logger = { info: jest.fn() };

      await core.runCopyToInfra({
        directoryCopies: [
          {
            source: posix.join(projectRoot, 'functions'),
            target: posix.join(projectRoot, 'infra/functions'),
          },
        ],
        fileCopies: {
          sourceDir: posix.join(projectRoot, 'src'),
          targetDir: posix.join(projectRoot, 'infra/src'),
          files: ['package.json'],
        },
        individualFileCopies: [
          {
            source: posix.join(projectRoot, 'src/env.json'),
            target: posix.join(projectRoot, 'infra/env.json'),
          },
        ],
        io,
        messageLogger: logger,
      });

      expect(io.ensureDirectory).toHaveBeenCalled();
      expect(io.copyFile).toHaveBeenCalledTimes(3);
      expect(logger.info).toHaveBeenCalledWith(
        'Copied: functions/index.js -> infra/functions/index.js'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Copied: src/env.json -> infra/env.json'
      );
    });

    it('skips optional sections when not provided', async () => {
      const io = {
        ensureDirectory: jest.fn(),
        readDirEntries: jest.fn(),
        copyFile: jest.fn(),
      };
      const logger = { info: jest.fn() };

      await core.runCopyToInfra({
        directoryCopies: [],
        io,
        messageLogger: logger,
      });

      expect(io.ensureDirectory).not.toHaveBeenCalled();
      expect(io.copyFile).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('ensures directory preparation even when no files exist', async () => {
      const io = {
        ensureDirectory: jest.fn().mockResolvedValue(undefined),
        readDirEntries: jest.fn().mockResolvedValue([]),
        copyFile: jest.fn(),
      };
      const logger = { info: jest.fn() };

      await core.runCopyToInfra({
        directoryCopies: [
          {
            source: posix.join(projectRoot, 'functions'),
            target: posix.join(projectRoot, 'infra/functions'),
          },
        ],
        io,
        messageLogger: logger,
      });

      expect(io.ensureDirectory).toHaveBeenCalledWith(
        posix.join(projectRoot, 'infra/functions')
      );
      expect(io.copyFile).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    });
  });
});
