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
    srcInputHandlersDir: posix.join(srcDir, 'core/browser/inputHandlers'),
    publicInputHandlersDir: posix.join(publicDir, 'inputHandlers'),
    srcConstantsDir: posix.join(srcDir, 'core/constants'),
    publicConstantsDir: posix.join(publicDir, 'constants'),
    srcCoreDir: posix.join(srcDir, 'core'),
    publicCoreDir: posix.join(publicDir, 'core'),
    srcCoreBrowserAudioControlsFile: posix.join(
      srcDir,
      'core/browser/audio-controls.js'
    ),
    publicBrowserAudioControlsFile: posix.join(
      publicDir,
      'browser/audio-controls.js'
    ),
    srcCoreObjectUtilsFile: posix.join(srcDir, 'core/objectUtils.js'),
    publicObjectUtilsFile: posix.join(publicDir, 'objectUtils.js'),
    srcCoreValidationFile: posix.join(srcDir, 'core/validation.js'),
    publicValidationFile: posix.join(publicDir, 'validation.js'),
    srcAssetsDir: posix.join(srcDir, 'browser/assets'),
    publicAssetsDir: publicDir,
    srcPresentersDir: posix.join(srcDir, 'core/browser/presenters'),
    publicPresentersDir: posix.join(publicDir, 'presenters'),
    srcBlogJson: posix.join(srcDir, 'blog.json'),
    publicBlogJson: posix.join(publicDir, 'blog.json'),
    srcRootDir: posix.join(srcDir, 'root'),
    publicRootDir: publicDir,
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
      'srcToysDir',
      posix.join(srcDir, 'core/browser/toys'),
    ]);
    expect(entries).toContainEqual([
      'publicToysDir',
      posix.join(publicDir, 'toys'),
    ]);
    expect(entries).toContainEqual([
      'publicBrowserDir',
      posix.join(publicDir, 'browser'),
    ]);
    expect(entries).toContainEqual([
      'publicPresentersDir',
      posix.join(publicDir, 'presenters'),
    ]);
    expect(entries).toContainEqual([
      'srcConstantsDir',
      posix.join(srcDir, 'core/constants'),
    ]);
    expect(entries).toContainEqual([
      'publicConstantsDir',
      posix.join(publicDir, 'constants'),
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
    it('executes the copy pipeline with injected directories', () => {
      const io = {
        directoryExists: jest.fn().mockReturnValue(true),
        createDirectory: jest.fn(),
        copyFile: jest.fn(),
        readDirEntries: jest.fn().mockReturnValue([]),
      };
      const logger = { info: jest.fn(), warn: jest.fn() };

      core.runCopyWorkflow({ directories, io, messageLogger: logger });

      expect(io.directoryExists).toHaveBeenCalledWith(directories.publicDir);
      expect(io.copyFile).toHaveBeenCalledWith(
        directories.srcBlogJson,
        directories.publicBlogJson
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Copied: src/blog.json -> public/blog.json'
      );
      expect(io.copyFile).toHaveBeenCalledWith(
        directories.srcCoreValidationFile,
        directories.publicValidationFile
      );
      expect(io.copyFile).toHaveBeenCalledWith(
        directories.srcCoreObjectUtilsFile,
        directories.publicObjectUtilsFile
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Copied: src/core/validation.js -> public/validation.js'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Copied: src/core/objectUtils.js -> public/objectUtils.js'
      );
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

    it('copies the blog JSON with a custom message', () => {
      const io = {
        directoryExists: jest.fn().mockReturnValue(false),
        createDirectory: jest.fn(),
        copyFile: jest.fn(),
      };
      const logger = { info: jest.fn(), warn: jest.fn() };

      core.copyBlogJson(directories, io, logger);

      expect(io.copyFile).toHaveBeenCalledWith(
        directories.srcBlogJson,
        directories.publicBlogJson
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Copied: src/blog.json -> public/blog.json'
      );
    });

    it('copies root utility files into the public directory', () => {
      const io = {
        directoryExists: jest.fn().mockReturnValue(true),
        createDirectory: jest.fn(),
        copyFile: jest.fn(),
      };
      const logger = { info: jest.fn(), warn: jest.fn() };

      core.copyRootUtilityFiles(directories, io, logger);

      expect(io.copyFile).toHaveBeenNthCalledWith(
        1,
        directories.srcCoreValidationFile,
        directories.publicValidationFile
      );
      expect(io.copyFile).toHaveBeenNthCalledWith(
        2,
        directories.srcCoreObjectUtilsFile,
        directories.publicObjectUtilsFile
      );
      expect(logger.info).toHaveBeenNthCalledWith(
        1,
        'Copied: src/core/validation.js -> public/validation.js'
      );
      expect(logger.info).toHaveBeenNthCalledWith(
        2,
        'Copied: src/core/objectUtils.js -> public/objectUtils.js'
      );
      expect(io.createDirectory).not.toHaveBeenCalled();
    });

    it('copies toy files and reports success', () => {
      const entriesMap = new Map();
      entriesMap.set(directories.srcToysDir, [
        createFileEntry('one.js'),
        createFileEntry('ignore.test.js'),
        createDirectoryEntry('nested'),
      ]);
      entriesMap.set(posix.join(directories.srcToysDir, 'nested'), [
        createFileEntry('two.js'),
      ]);

      const io = {
        directoryExists: jest.fn().mockReturnValue(true),
        createDirectory: jest.fn(),
        copyFile: jest.fn(),
        readDirEntries: jest.fn(dir => entriesMap.get(dir) ?? []),
      };
      const logger = { info: jest.fn(), warn: jest.fn() };

      core.copyToyFiles(directories, io, logger);

      expect(io.copyFile).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenLastCalledWith(
        'Toy files copied successfully!'
      );
    });

    it('falls back to the public directory when a toys directory is absent', () => {
      const entriesMap = new Map();
      entriesMap.set(directories.srcToysDir, [createFileEntry('solo.js')]);

      const io = {
        directoryExists: jest.fn().mockReturnValue(false),
        createDirectory: jest.fn(),
        copyFile: jest.fn(),
        readDirEntries: jest.fn(dir => entriesMap.get(dir) ?? []),
      };
      const logger = { info: jest.fn(), warn: jest.fn() };
      const dirs = { ...directories, publicToysDir: undefined };

      core.copyToyFiles(dirs, io, logger);

      expect(io.copyFile).toHaveBeenCalledWith(
        posix.join(dirs.srcToysDir, 'solo.js'),
        posix.join(dirs.publicDir, 'solo.js')
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Toy files copied successfully!'
      );
    });

    it('copies presenter files when present', () => {
      const presenterFile = createFileEntry('deck.js');
      const io = {
        directoryExists: jest
          .fn()
          .mockImplementation(
            target => target === directories.srcPresentersDir
          ),
        createDirectory: jest.fn(),
        copyFile: jest.fn(),
        readDirEntries: jest.fn().mockReturnValue([presenterFile]),
      };
      const logger = { info: jest.fn(), warn: jest.fn() };

      core.copyPresenterFiles(directories, io, logger);

      expect(io.copyFile).toHaveBeenCalledWith(
        posix.join(directories.srcPresentersDir, 'deck.js'),
        posix.join(directories.publicPresentersDir, 'deck.js')
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Copied presenter: src/core/browser/presenters/deck.js -> public/presenters/deck.js'
      );
      expect(logger.info).toHaveBeenLastCalledWith(
        'Presenter files copied successfully!'
      );

      io.directoryExists.mockReturnValue(false);
      core.copyPresenterFiles(directories, io, logger);
      expect(logger.warn).toHaveBeenCalledWith(
        'Warning: presenters directory not found at src/core/browser/presenters'
      );
    });

    it('copies audio controls from core into the browser directory', () => {
      const io = {
        directoryExists: jest
          .fn()
          .mockImplementation(
            target => target === directories.srcCoreBrowserAudioControlsFile
          ),
        createDirectory: jest.fn(),
        copyFile: jest.fn(),
        readDirEntries: jest.fn(),
      };
      const logger = { info: jest.fn(), warn: jest.fn() };

      core.copyBrowserAudioControls(directories, io, logger);

      expect(io.createDirectory).toHaveBeenCalledWith(
        posix.join(directories.publicDir, 'browser')
      );
      expect(io.copyFile).toHaveBeenCalledWith(
        directories.srcCoreBrowserAudioControlsFile,
        directories.publicBrowserAudioControlsFile
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('warns when the audio controls file is missing', () => {
      const io = {
        directoryExists: jest.fn().mockReturnValue(false),
        createDirectory: jest.fn(),
        copyFile: jest.fn(),
        readDirEntries: jest.fn(),
      };
      const logger = { info: jest.fn(), warn: jest.fn() };

      core.copyBrowserAudioControls(directories, io, logger);

      expect(logger.warn).toHaveBeenCalledWith(
        'Warning: audio controls file not found at src/core/browser/audio-controls.js'
      );
      expect(io.copyFile).not.toHaveBeenCalled();
    });

    it('copies core browser modules including load static config core', () => {
      const existingSources = new Set([directories.srcCoreDir]);
      const entriesMap = new Map();
      entriesMap.set(directories.srcCoreDir, [createDirectoryEntry('browser')]);
      entriesMap.set(posix.join(directories.srcCoreDir, 'browser'), [
        createFileEntry('load-static-config-core.js'),
      ]);

      const io = {
        directoryExists: jest.fn(target => existingSources.has(target)),
        createDirectory: jest.fn(),
        copyFile: jest.fn(),
        readDirEntries: jest.fn(dir => entriesMap.get(dir) ?? []),
      };
      const logger = { info: jest.fn(), warn: jest.fn() };

      core.copySupportingDirectories(directories, io, logger);

      expect(io.copyFile).toHaveBeenCalledWith(
        posix.join(
          directories.srcCoreDir,
          'browser/load-static-config-core.js'
        ),
        posix.join(
          directories.publicCoreDir,
          'browser/load-static-config-core.js'
        )
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Core files copied successfully!'
      );
    });

    it('copies supporting directories and logs missing ones', () => {
      const existingSources = new Set([directories.srcBrowserDir]);
      const entriesMap = new Map();
      entriesMap.set(directories.srcBrowserDir, [createFileEntry('widget.js')]);

      const io = {
        directoryExists: jest.fn(target => existingSources.has(target)),
        createDirectory: jest.fn(),
        copyFile: jest.fn(),
        readDirEntries: jest.fn(dir => entriesMap.get(dir) ?? []),
      };
      const logger = { info: jest.fn(), warn: jest.fn() };

      core.copySupportingDirectories(directories, io, logger);

      expect(io.copyFile).toHaveBeenCalledWith(
        posix.join(directories.srcBrowserDir, 'widget.js'),
        posix.join(directories.publicBrowserDir, 'widget.js')
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Browser files copied successfully!'
      );
      expect(logger.warn).toHaveBeenCalledWith(
        'Warning: inputHandlers directory not found at src/core/browser/inputHandlers'
      );
      expect(logger.warn).toHaveBeenCalledWith(
        'Warning: constants directory not found at src/core/constants'
      );
      expect(logger.warn).toHaveBeenCalledWith(
        'Warning: core directory not found at src/core'
      );
      expect(logger.warn).toHaveBeenCalledWith(
        'Warning: assets directory not found at src/browser/assets'
      );
    });
  });
});
