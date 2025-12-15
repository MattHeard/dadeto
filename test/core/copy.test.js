import { jest } from '@jest/globals';
import path from 'path';
import {
  createCopyCore,
  createSharedDirectoryEntries,
} from '../../src/core/copy.js';

const posix = path.posix;

const createDirectories = () => {
  const projectRoot = '/project';
  const srcDir = posix.join(projectRoot, 'src');
  const publicDir = posix.join(projectRoot, 'public');
  return {
    projectRoot,
    srcDir,
    publicDir,
    srcToysDir: posix.join(srcDir, 'core/browser/toys'),
    publicToysDir: posix.join(publicDir, 'toys'),
    srcBrowserDir: posix.join(srcDir, 'browser'),
    publicBrowserDir: posix.join(publicDir, 'browser'),
    srcUtilsDir: posix.join(srcDir, 'utils'),
    publicUtilsDir: posix.join(publicDir, 'utils'),
    srcCoreDir: posix.join(srcDir, 'core'),
    publicCoreDir: posix.join(publicDir, 'core'),
    srcCoreBrowserDir: posix.join(srcDir, 'core/browser'),
    publicCoreBrowserDir: posix.join(publicDir, 'browser'),
  };
};

const createFileEntry = name => ({
  name,
  isFile: () => true,
  isDirectory: () => false,
});

const createDirectoryEntry = name => ({
  name,
  isFile: () => false,
  isDirectory: () => true,
});

describe('createSharedDirectoryEntries', () => {
  it('creates paired entries for shared directories', () => {
    const projectRoot = '/project';
    const srcDir = posix.join(projectRoot, 'src');
    const publicDir = posix.join(projectRoot, 'public');

    const entries = createSharedDirectoryEntries({
      path: posix,
      srcDir,
      publicDir,
    });

    expect(entries).toContainEqual([
      'srcBrowserDir',
      posix.join(srcDir, 'browser'),
    ]);
    expect(entries).toContainEqual([
      'publicBrowserDir',
      posix.join(publicDir, 'browser'),
    ]);
    expect(entries).toContainEqual([
      'srcCoreBrowserDir',
      posix.join(srcDir, 'core/browser'),
    ]);
    expect(entries).toContainEqual([
      'publicCoreBrowserDir',
      posix.join(publicDir, 'browser'),
    ]);
    expect(entries).toContainEqual(['srcCoreDir', posix.join(srcDir, 'core')]);
    expect(entries).toContainEqual([
      'publicCoreDir',
      posix.join(publicDir, 'core'),
    ]);
  });

  it('allows custom directory pairs to be provided', () => {
    const projectRoot = '/project';
    const srcDir = posix.join(projectRoot, 'src');
    const publicDir = posix.join(projectRoot, 'public');
    const pairs = [{ key: 'Docs', relativePath: 'docs' }];

    const entries = createSharedDirectoryEntries({
      path: posix,
      srcDir,
      publicDir,
      pairs,
    });

    expect(entries).toEqual([
      ['srcDocsDir', posix.join(srcDir, 'docs')],
      ['publicDocsDir', posix.join(publicDir, 'docs')],
    ]);
  });

  it('supports overriding the public directory path', () => {
    const projectRoot = '/project';
    const srcDir = posix.join(projectRoot, 'src');
    const publicDir = posix.join(projectRoot, 'public');
    const pairs = [
      {
        key: 'Widgets',
        relativePath: 'core/widgets',
        publicRelativePath: 'widgets',
      },
    ];

    const entries = createSharedDirectoryEntries({
      path: posix,
      srcDir,
      publicDir,
      pairs,
    });

    expect(entries).toEqual([
      ['srcWidgetsDir', posix.join(srcDir, 'core/widgets')],
      ['publicWidgetsDir', posix.join(publicDir, 'widgets')],
    ]);
  });
});

describe('createCopyCore', () => {
  let directories;
  let core;

  beforeEach(() => {
    directories = createDirectories();
    core = createCopyCore({ directories, path: posix });
  });

  describe('formatPathForLog', () => {
    it("returns '.' when the target is the project root", () => {
      expect(core.formatPathForLog(directories.projectRoot)).toBe('.');
    });

    it('returns a relative path for files inside the project', () => {
      const filePath = posix.join(
        directories.projectRoot,
        'src/core/browser/toys/widget.js'
      );
      expect(core.formatPathForLog(filePath)).toBe(
        'src/core/browser/toys/widget.js'
      );
    });

    it('returns the original path for files outside of the project', () => {
      const externalPath = '/external/file.js';
      expect(core.formatPathForLog(externalPath)).toBe(externalPath);
    });
  });

  describe('file entry helpers', () => {
    it('validates JavaScript file endings', () => {
      expect(core.isCorrectJsFileEnding('widget.js')).toBe(true);
      expect(core.isCorrectJsFileEnding('widget.test.js')).toBe(false);
      expect(core.isCorrectJsFileEnding('widget.ts')).toBe(false);
    });

    it('identifies JavaScript files', () => {
      const jsEntry = createFileEntry('widget.js');
      const testEntry = createFileEntry('widget.test.js');
      const dirEntry = createDirectoryEntry('nested');
      expect(core.isJsFile(jsEntry)).toBe(true);
      expect(core.isJsFile(testEntry)).toBe(false);
      expect(core.isJsFile(dirEntry)).toBe(false);
    });

    it('determines which entries should be inspected', () => {
      const jsEntry = createFileEntry('widget.js');
      const svgEntry = createFileEntry('icon.svg');
      const dirEntry = createDirectoryEntry('nested');
      expect(core.shouldCheckEntry(dirEntry)).toBe(true);
      expect(core.shouldCheckEntry(jsEntry)).toBe(true);
      expect(core.shouldCheckEntry(svgEntry)).toBe(false);
    });
  });

  describe('directory traversal', () => {
    it('returns new files for directories and files', () => {
      const listEntries = jest.fn(dir => {
        if (dir === posix.join(directories.srcToysDir, 'nested')) {
          return [createFileEntry('deep.js')];
        }
        return [];
      });

      const directoryEntry = createDirectoryEntry('nested');
      const fileEntry = createFileEntry('keep.js');
      const dirPath = posix.join(directories.srcToysDir, 'nested');
      const filePath = posix.join(directories.srcToysDir, 'keep.js');

      expect(
        core.getActualNewFiles(directoryEntry, dirPath, listEntries)
      ).toEqual([posix.join(dirPath, 'deep.js')]);
      expect(core.getActualNewFiles(fileEntry, filePath, listEntries)).toEqual([
        filePath,
      ]);
    });

    it('filters entries when accumulating JavaScript files', () => {
      const entriesMap = new Map();
      entriesMap.set(directories.srcToysDir, [
        createFileEntry('keep.js'),
        createFileEntry('skip.test.js'),
        createFileEntry('README.md'),
        createDirectoryEntry('nested'),
      ]);
      entriesMap.set(posix.join(directories.srcToysDir, 'nested'), [
        createFileEntry('nested.js'),
        createDirectoryEntry('deep'),
      ]);
      entriesMap.set(posix.join(directories.srcToysDir, 'nested/deep'), [
        createFileEntry('deep.js'),
      ]);

      const listEntries = jest.fn(dir => entriesMap.get(dir) ?? []);

      const result = core.findJsFiles(directories.srcToysDir, listEntries);
      expect(result).toEqual([
        posix.join(directories.srcToysDir, 'keep.js'),
        posix.join(directories.srcToysDir, 'nested/nested.js'),
        posix.join(directories.srcToysDir, 'nested/deep/deep.js'),
      ]);
    });

    it('returns possible new files when the entry should be checked', () => {
      const fileEntry = createFileEntry('keep.js');
      const dirEntry = createDirectoryEntry('nested');
      const ignoredEntry = createFileEntry('README.md');
      const listEntries = jest.fn().mockReturnValue([]);
      const dirPath = posix.join(directories.srcToysDir, 'nested');
      const filePath = posix.join(directories.srcToysDir, 'keep.js');

      expect(core.getPossibleNewFiles(dirEntry, dirPath, listEntries)).toEqual(
        []
      );
      expect(listEntries).toHaveBeenCalledWith(dirPath);
      expect(
        core.getPossibleNewFiles(fileEntry, filePath, listEntries)
      ).toEqual([filePath]);
      expect(
        core.getPossibleNewFiles(ignoredEntry, filePath, listEntries)
      ).toEqual([]);
    });

    it('accumulates JavaScript file paths', () => {
      const jsFiles = ['existing.js'];
      const entry = createFileEntry('next.js');
      const fullPath = posix.join(directories.srcToysDir, 'next.js');
      const listEntries = jest.fn();
      expect(
        core.accumulateJsFiles(jsFiles, entry, {
          dir: directories.srcToysDir,
          listEntries,
        })
      ).toEqual(['existing.js', fullPath]);
    });
  });

  describe('copy pair helpers', () => {
    it('creates copy pairs from file paths', () => {
      const files = [
        posix.join(directories.srcToysDir, 'one.js'),
        posix.join(directories.srcToysDir, 'nested/two.js'),
      ];
      expect(
        core.createCopyPairs(
          files,
          directories.srcToysDir,
          directories.publicDir
        )
      ).toEqual([
        {
          source: posix.join(directories.srcToysDir, 'one.js'),
          destination: posix.join(directories.publicDir, 'one.js'),
        },
        {
          source: posix.join(directories.srcToysDir, 'nested/two.js'),
          destination: posix.join(directories.publicDir, 'nested/two.js'),
        },
      ]);
    });

    it('ensures directories exist before copying files', () => {
      const io = {
        directoryExists: jest.fn().mockReturnValue(false),
        createDirectory: jest.fn(),
        copyFile: jest.fn(),
      };
      const logger = { info: jest.fn(), warn: jest.fn() };
      const source = posix.join(directories.srcToysDir, 'widget.js');
      const destination = posix.join(directories.publicToysDir, 'widget.js');

      core.copyFileWithDirectories(io, {
        source,
        destination,
        messageLogger: logger,
      });

      expect(io.createDirectory).toHaveBeenCalledWith(
        directories.publicToysDir
      );
      expect(io.copyFile).toHaveBeenCalledWith(source, destination);
      expect(logger.info).toHaveBeenCalledWith(
        'Copied: src/core/browser/toys/widget.js -> public/toys/widget.js'
      );

      const customMessage = 'Custom copy';
      const existingIo = {
        directoryExists: jest.fn().mockReturnValue(true),
        createDirectory: jest.fn(),
        copyFile: jest.fn(),
      };
      core.copyFileWithDirectories(existingIo, {
        source,
        destination,
        messageLogger: logger,
        message: customMessage,
      });
      expect(logger.info).toHaveBeenCalledWith(customMessage);
      expect(existingIo.createDirectory).not.toHaveBeenCalled();
    });

    it('copies each pair of files', () => {
      const pairs = [
        {
          source: posix.join(directories.srcToysDir, 'one.js'),
          destination: posix.join(directories.publicToysDir, 'one.js'),
        },
        {
          source: posix.join(directories.srcToysDir, 'two.js'),
          destination: posix.join(directories.publicToysDir, 'two.js'),
        },
      ];
      const io = {
        directoryExists: jest.fn().mockReturnValue(true),
        createDirectory: jest.fn(),
        copyFile: jest.fn(),
      };
      const logger = { info: jest.fn(), warn: jest.fn() };

      core.copyFilePairs(pairs, io, logger);

      expect(io.copyFile).toHaveBeenNthCalledWith(
        1,
        pairs[0].source,
        pairs[0].destination
      );
      expect(io.copyFile).toHaveBeenNthCalledWith(
        2,
        pairs[1].source,
        pairs[1].destination
      );
    });
  });

  describe('runCopyWorkflow', () => {
    it('delegates browser trees and core root files to the copy helpers', () => {
      const io = {
        directoryExists: jest.fn().mockReturnValue(true),
        createDirectory: jest.fn(),
        copyFile: jest.fn(),
        readDirEntries: jest.fn().mockReturnValue([]),
      };
      const logger = { info: jest.fn(), warn: jest.fn() };

      core.runCopyWorkflow({ directories, io, messageLogger: logger });

      expect(io.directoryExists).toHaveBeenCalledWith(directories.publicDir);
      expect(logger.info).toHaveBeenCalledWith(
        'Browser files copied successfully!'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Core browser files copied successfully!'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Core root scripts copied successfully!'
      );
      expect(io.readDirEntries).toHaveBeenCalledWith(directories.srcCoreDir);
    });
  });

  describe('directory handling', () => {
    it('handles directory and file entries', () => {
      const io = {
        directoryExists: jest.fn().mockReturnValue(false),
        createDirectory: jest.fn(),
        copyFile: jest.fn(),
        readDirEntries: jest.fn(dir => {
          if (dir === posix.join(directories.srcToysDir, 'nested')) {
            return [createFileEntry('deep.js')];
          }
          return [];
        }),
      };
      const logger = { info: jest.fn(), warn: jest.fn() };
      const directoryEntry = createDirectoryEntry('nested');
      const fileEntry = createFileEntry('keep.js');
      const directoriesContext = {
        src: directories.srcToysDir,
        dest: directories.publicToysDir,
      };
      const copyContext = { io, messageLogger: logger };

      core.handleDirectoryEntry(
        directoryEntry,
        directoriesContext,
        copyContext
      );

      expect(io.copyFile).toHaveBeenCalledWith(
        posix.join(directories.srcToysDir, 'nested/deep.js'),
        posix.join(directories.publicToysDir, 'nested/deep.js')
      );

      core.handleDirectoryEntry(fileEntry, directoriesContext, copyContext);

      expect(io.copyFile).toHaveBeenCalledWith(
        posix.join(directories.srcToysDir, 'keep.js'),
        posix.join(directories.publicToysDir, 'keep.js')
      );
    });

    it('processes directory entries in order', () => {
      const io = {
        directoryExists: jest.fn().mockReturnValue(true),
        createDirectory: jest.fn(),
        copyFile: jest.fn(),
        readDirEntries: jest.fn().mockReturnValue([]),
      };
      const logger = { info: jest.fn(), warn: jest.fn() };
      const entries = [createFileEntry('one.js'), createFileEntry('two.js')];
      const directoriesContext = {
        src: directories.srcToysDir,
        dest: directories.publicToysDir,
      };
      const copyContext = { io, messageLogger: logger };

      core.processDirectoryEntries(entries, directoriesContext, copyContext);

      expect(io.copyFile).toHaveBeenCalledTimes(2);
    });

    it('recursively copies directories', () => {
      const entriesMap = new Map();
      entriesMap.set(directories.srcBrowserDir, [createFileEntry('widget.js')]);

      const io = {
        directoryExists: jest
          .fn()
          .mockImplementation(target => target === directories.srcBrowserDir),
        createDirectory: jest.fn(),
        copyFile: jest.fn(),
        readDirEntries: jest.fn(dir => entriesMap.get(dir) ?? []),
      };
      const logger = { info: jest.fn(), warn: jest.fn() };

      core.copyDirRecursive(
        {
          src: directories.srcBrowserDir,
          dest: directories.publicBrowserDir,
        },
        { io, messageLogger: logger }
      );

      expect(io.createDirectory).toHaveBeenCalledWith(
        directories.publicBrowserDir
      );
      expect(io.copyFile).toHaveBeenCalledWith(
        posix.join(directories.srcBrowserDir, 'widget.js'),
        posix.join(directories.publicBrowserDir, 'widget.js')
      );
    });
  });

  describe('copy workflows', () => {
    it('copies directory trees when they exist', () => {
      const io = {
        directoryExists: jest
          .fn()
          .mockImplementation(target => target === directories.srcBrowserDir),
        createDirectory: jest.fn(),
        copyFile: jest.fn(),
        readDirEntries: jest.fn().mockReturnValue([]),
      };
      const logger = { info: jest.fn(), warn: jest.fn() };

      core.copyDirectoryTreeIfExists(
        {
          src: directories.srcBrowserDir,
          dest: directories.publicBrowserDir,
          successMessage: 'Browser files copied successfully!',
          missingMessage: 'missing',
        },
        io,
        logger
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Browser files copied successfully!'
      );

      core.copyDirectoryTreeIfExists(
        {
          src: posix.join(directories.srcDir, 'unknown'),
          dest: posix.join(directories.publicDir, 'unknown'),
          successMessage: "won't happen",
          missingMessage: 'missing message',
        },
        io,
        logger
      );

      expect(logger.warn).toHaveBeenCalledWith('missing message');
    });

    it('copies browser directories when the sources exist', () => {
      const io = {
        directoryExists: jest.fn().mockReturnValue(true),
        createDirectory: jest.fn(),
        copyFile: jest.fn(),
        readDirEntries: jest.fn().mockReturnValue([]),
      };
      const logger = { info: jest.fn(), warn: jest.fn() };

      core.copyBrowserTrees(directories, io, logger);

      expect(logger.info).toHaveBeenCalledWith(
        'Browser files copied successfully!'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Core browser files copied successfully!'
      );
      expect(io.directoryExists).toHaveBeenCalledWith(
        directories.srcBrowserDir
      );
      expect(io.directoryExists).toHaveBeenCalledWith(
        directories.srcCoreBrowserDir
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('copies root-level core scripts', () => {
      const entries = [
        createFileEntry('keep.js'),
        createFileEntry('skip.test.js'),
        createDirectoryEntry('nested'),
        createFileEntry('another.js'),
      ];
      const io = {
        directoryExists: jest.fn().mockReturnValue(true),
        createDirectory: jest.fn(),
        copyFile: jest.fn(),
        readDirEntries: jest.fn().mockReturnValue(entries),
      };
      const logger = { info: jest.fn(), warn: jest.fn() };

      core.copyCoreRootFiles(directories, io, logger);

      expect(io.copyFile).toHaveBeenNthCalledWith(
        1,
        posix.join(directories.srcCoreDir, 'keep.js'),
        posix.join(directories.publicCoreDir, 'keep.js')
      );
      expect(io.copyFile).toHaveBeenNthCalledWith(
        2,
        posix.join(directories.srcCoreDir, 'another.js'),
        posix.join(directories.publicCoreDir, 'another.js')
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Core root scripts copied successfully!'
      );
    });

    it('warns when the core directory is missing', () => {
      const io = {
        directoryExists: jest.fn().mockReturnValue(false),
        createDirectory: jest.fn(),
        copyFile: jest.fn(),
        readDirEntries: jest.fn(),
      };
      const logger = { info: jest.fn(), warn: jest.fn() };

      core.copyCoreRootFiles(directories, io, logger);

      expect(logger.warn).toHaveBeenCalledWith(
        'Warning: core directory not found at src/core'
      );
      expect(io.copyFile).not.toHaveBeenCalled();
    });
  });
});
