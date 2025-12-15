import { buildCopyExportMap } from './copy-export-utils.js';

export const sharedDirectoryPairs = [
  { key: 'Browser', relativePath: 'browser', publicRelativePath: 'browser' },
  {
    key: 'CoreBrowser',
    relativePath: 'core/browser',
    publicRelativePath: 'core/browser',
  },
  { key: 'Core', relativePath: 'core', publicRelativePath: 'core' },
];

/**
 * Choose the most readable representation for a relative path.
 * @param {string} absolutePath - Original absolute path provided to the logger.
 * @param {string} relativePath - Path relative to the project root.
 * @returns {string} Either the relative path or original absolute path when outside the project.
 */
export function selectReadablePath(absolutePath, relativePath) {
  if (relativePath.startsWith('..')) {
    return absolutePath;
  }
  return relativePath;
}

/**
 * Format a target path relative to the provided project root.
 * @param {string} projectRoot - Root directory to use for relative comparisons.
 * @param {string} targetPath - Path to format for display.
 * @param {(from: string, to: string) => string} relativeFn - Path.relative implementation.
 * @returns {string} Human-readable representation of the path.
 */
export function formatPathRelativeToProject(
  projectRoot,
  targetPath,
  relativeFn
) {
  const relativePath = relativeFn(projectRoot, targetPath);
  if (!relativePath) {
    return '.';
  }
  return selectReadablePath(targetPath, relativePath);
}

/**
 * Build the directory entry tuples used to configure shared copy locations.
 * @param {{
 *   path: { join: typeof import('path').join },
 *   srcDir: string,
 *   publicDir: string,
 *   pairs?: Array<{
 *     key: string,
 *     relativePath: string,
 *     publicRelativePath?: string,
 *   }>,
 * }} options - Dependencies and configuration.
 * @returns {Array<[string, string]>} Key/path pairs for copy destinations.
 */
export function createSharedDirectoryEntries({
  path: pathDeps,
  srcDir,
  publicDir,
  pairs = sharedDirectoryPairs,
}) {
  const { join } = pathDeps;
  return pairs.flatMap(({ key, relativePath, publicRelativePath }) => {
    const srcKey = `src${key}Dir`;
    const destKey = `public${key}Dir`;
    const srcPath = join(srcDir, relativePath);
    const destinationRelativePath = publicRelativePath ?? relativePath;
    const destPath = join(publicDir, destinationRelativePath);
    return [
      [srcKey, srcPath],
      [destKey, destPath],
    ];
  });
}

/**
 * Create helpers that orchestrate copying source assets into the public tree.
 * @param {{ directories: Record<string, string>, path: Pick<typeof import('path'), 'join' | 'dirname' | 'relative'> }} options - File system dependencies.
 * @param {Record<string, string>} options.directories - Directory configuration.
 * @param {Pick<typeof import('path'), 'join' | 'dirname' | 'relative'>} options.path - Node path helpers.
 * @returns {Record<string, Function>} Copy helper functions.
 */
export function createCopyCore({ directories: dirConfig, path: pathDeps }) {
  const { join, dirname, relative } = pathDeps;

  /**
   * Format a path for display relative to the project root.
   * @param {string} targetPath - Absolute path to format.
   * @returns {string} Human-friendly relative path.
   */
  function formatPathForLog(targetPath) {
    return formatPathRelativeToProject(
      dirConfig.projectRoot,
      targetPath,
      relative
    );
  }

  /**
   * Copy entries using the provided logger and message resolver.
   * @param {Array<{ source: string, destination: string }>} entries Entries to copy.
   * @param {{
   *   directoryExists: (target: string) => boolean,
   *   createDirectory: (target: string) => void,
   *   copyFile: (source: string, destination: string) => void,
   *   readDirEntries: (dir: string) => import('fs').Dirent[],
   * }} io FS adapters.
   * @param {{
   *   messageLogger: { info?: (message: string) => void, warn?: (message: string) => void },
   *   resolveMessage: (entry: { source: string, destination: string }) => string,
   * }} options Logger and message builder.
   * @returns {void}
   */
  function copyEntries(entries, io, { messageLogger, resolveMessage }) {
    entries.forEach(({ source, destination }) => {
      copyFileWithDirectories(io, {
        source,
        destination,
        messageLogger,
        message: resolveMessage({ source, destination }),
      });
    });
  }

  /**
   * Determine whether a filename represents a copyable JS module.
   * @param {string} entryName - Directory entry name.
   * @returns {boolean} True when the file should be copied.
   */
  function isCorrectJsFileEnding(entryName) {
    return entryName.endsWith('.js') && !entryName.endsWith('.test.js');
  }

  /**
   * Check whether a directory entry is a JS file that can be copied.
   * @param {import('fs').Dirent} entry - Directory entry to inspect.
   * @returns {boolean} True when the entry is a JS file.
   */
  function isJsFile(entry) {
    return entry.isFile() && isCorrectJsFileEnding(entry.name);
  }

  /**
   * Determine if the entry warrants a recursive or file-level check.
   * @param {import('fs').Dirent} entry - Directory entry to test.
   * @returns {boolean} True when the entry should be processed further.
   */
  function shouldCheckEntry(entry) {
    return entry.isDirectory() || isJsFile(entry);
  }

  /**
   * Resolve new files discovered from a directory entry.
   * @param {import('fs').Dirent} entry - Directory entry encountered.
   * @param {string} fullPath - Absolute path to the entry.
   * @param {(dir: string) => import('fs').Dirent[]} listEntries - Directory reader.
   * @returns {string[]} JS file paths sourced from the entry.
   */
  function getActualNewFiles(entry, fullPath, listEntries) {
    if (entry.isDirectory()) {
      return findJsFiles(fullPath, listEntries);
    }
    return [fullPath];
  }

  /**
   * Filter entries that should yield candidate JS files.
   * @param {import('fs').Dirent} entry - Directory entry to evaluate.
   * @param {string} fullPath - Absolute path to the entry.
   * @param {(dir: string) => import('fs').Dirent[]} listEntries - Directory reader.
   * @returns {string[]} Candidate JS file paths.
   */
  function getPossibleNewFiles(entry, fullPath, listEntries) {
    if (shouldCheckEntry(entry)) {
      return getActualNewFiles(entry, fullPath, listEntries);
    }
    return [];
  }

  /**
   * Append JS files discovered from a directory entry.
   * @param {string[]} jsFiles - Accumulated JS files.
   * @param {import('fs').Dirent} entry - Directory entry to inspect.
   * @param {{ dir: string, listEntries: (dir: string) => import('fs').Dirent[] }} context
   *   - Directory context.
   * @returns {string[]} Updated list of JS files.
   */
  function accumulateJsFiles(jsFiles, entry, context) {
    const { dir, listEntries } = context;
    const fullPath = join(dir, entry.name);
    const newFiles = getPossibleNewFiles(entry, fullPath, listEntries);
    return jsFiles.concat(newFiles);
  }

  /**
   * Recursively find JS files beneath the provided directory.
   * @param {string} dir - Root directory to inspect.
   * @param {(dir: string) => import('fs').Dirent[]} listEntries - Directory reader.
   * @returns {string[]} JS file paths discovered within the directory tree.
   */
  function findJsFiles(dir, listEntries) {
    const entries = listEntries(dir);
    return entries.reduce(
      (jsFiles, entry) =>
        accumulateJsFiles(jsFiles, entry, { dir, listEntries }),
      []
    );
  }

  /**
   * Create copy plans mapping source JS files to their destinations.
   * @param {string[]} files - Source file paths.
   * @param {string} sourceRoot - Root of the source directory.
   * @param {string} destinationRoot - Root of the destination directory.
   * @returns {Array<{ source: string, destination: string }>} Copy instructions.
   */
  function createCopyPairs(files, sourceRoot, destinationRoot) {
    return files.map(filePath => ({
      source: filePath,
      destination: join(destinationRoot, relative(sourceRoot, filePath)),
    }));
  }

  /**
   * Ensure the destination directory exists before copying files.
   * @param {{ directoryExists: (target: string) => boolean, createDirectory: (target: string) => void }} io
   *   - Directory management helpers.
   * @param {string} targetDir - Directory that must be present.
   * @returns {void}
   */
  function ensureDirectoryExists(io, targetDir) {
    if (!io.directoryExists(targetDir)) {
      io.createDirectory(targetDir);
    }
  }

  /**
   * Copy a file and ensure supporting directories exist.
   * @param {{
   *   directoryExists: (target: string) => boolean,
   *   createDirectory: (target: string) => void,
   *   copyFile: (source: string, destination: string) => void,
   * }} io - File system adapters.
   * @param {{
   *   source: string,
   *   destination: string,
   *   messageLogger: { info: (message: string) => void },
   *   message?: string,
   * }} options - File copy configuration.
   * @returns {void}
   */
  function copyFileWithDirectories(
    io,
    { source, destination, messageLogger, message }
  ) {
    ensureDirectoryExists(io, dirname(destination));
    io.copyFile(source, destination);
    const relativeSource = formatPathForLog(source);
    const relativeDestination = formatPathForLog(destination);
    const logMessage =
      message ?? `Copied: ${relativeSource} -> ${relativeDestination}`;
    messageLogger.info(logMessage);
  }

  /**
   * Execute a list of copy operations.
   * @param {Array<{ source: string, destination: string }>} copyPairs - Planned copy operations.
   * @param {{ copyFile: (source: string, destination: string) => void, directoryExists: (target: string) => boolean, createDirectory: (target: string) => void }} io
   *   - File system adapters.
   * @param {{ info: (message: string) => void }} messageLogger - Logger for status updates.
   * @returns {void}
   */
  function copyFilePairs(copyPairs, io, messageLogger) {
    copyPairs.forEach(({ source, destination }) => {
      copyFileWithDirectories(io, { source, destination, messageLogger });
    });
  }

  /**
   * Copy a directory entry, recursing into subdirectories as needed.
   * @param {import('fs').Dirent} entry - Directory entry to copy.
   * @param {{ src: string, dest: string }} directories - Source and destination directory paths.
   * @param {{
   *   io: {
   *     directoryExists: (target: string) => boolean,
   *     createDirectory: (target: string) => void,
   *     copyFile: (source: string, destination: string) => void,
   *     readDirEntries: (dir: string) => import('fs').Dirent[],
   *   },
   *   messageLogger: { info: (message: string) => void },
   * }} context - File system adapters and logger for status updates.
   * @returns {void}
   */
  function handleDirectoryEntry(entry, directories, context) {
    const { src, dest } = directories;
    const { io, messageLogger } = context;
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive({ src: srcPath, dest: destPath }, context);
      return;
    }
    copyFileWithDirectories(io, {
      source: srcPath,
      destination: destPath,
      messageLogger,
    });
  }

  /**
   * Iterate through directory entries and copy each one.
   * @param {import('fs').Dirent[]} entries - Directory entries to copy.
   * @param {{ src: string, dest: string }} directories - Source and destination directory paths.
   * @param {{
   *   io: {
   *     directoryExists: (target: string) => boolean,
   *     createDirectory: (target: string) => void,
   *     copyFile: (source: string, destination: string) => void,
   *     readDirEntries: (dir: string) => import('fs').Dirent[],
   *   },
   *   messageLogger: { info: (message: string) => void },
   * }} context - File system adapters and logger for status updates.
   * @returns {void}
   */
  function processDirectoryEntries(entries, directories, context) {
    entries.forEach(entry => {
      handleDirectoryEntry(entry, directories, context);
    });
  }

  /**
   * Recursively copy the contents of a directory.
   * @param {{ src: string, dest: string }} directories - Source and destination directory paths.
   * @param {{
   *   io: {
   *     directoryExists: (target: string) => boolean,
   *     createDirectory: (target: string) => void,
   *     copyFile: (source: string, destination: string) => void,
   *     readDirEntries: (dir: string) => import('fs').Dirent[],
   *   },
   *   messageLogger: { info: (message: string) => void },
   * }} context - File system adapters and logger for status updates.
   * @returns {void}
   */
  function copyDirRecursive(directories, context) {
    const { src, dest } = directories;
    const { io } = context;
    ensureDirectoryExists(io, dest);
    const entries = io.readDirEntries(src);
    processDirectoryEntries(entries, directories, context);
  }

  /**
   * Copy a directory tree when the source exists, logging missing directories.
   * @param {{
   *   src: string,
   *   dest: string,
   *   successMessage: string,
   *   missingMessage: string,
   * }} plan - Copy plan describing the directory tree.
   * @param {{
   *   directoryExists: (target: string) => boolean,
   *   createDirectory: (target: string) => void,
   *   copyFile: (source: string, destination: string) => void,
   *   readDirEntries: (dir: string) => import('fs').Dirent[],
   * }} io - File system adapters.
   * @param {{ info: (message: string) => void, warn: (message: string) => void }} messageLogger - Logger for status updates.
   * @returns {void}
   */
  function copyDirectoryTreeIfExists(plan, io, messageLogger) {
    const { src, dest, successMessage, missingMessage } = plan;
    if (!io.directoryExists(src)) {
      messageLogger.warn(missingMessage);
      return;
    }
    copyDirRecursive({ src, dest }, { io, messageLogger });
    messageLogger.info(successMessage);
  }

  /**
   * Copy one or more browser-related directory trees into the public browser directory.
   * @param {Record<string, string>} dirs - Directory map.
   * @param {{
   *   directoryExists: (target: string) => boolean,
   *   createDirectory: (target: string) => void,
   *   copyFile: (source: string, destination: string) => void,
   *   readDirEntries: (dir: string) => import('fs').Dirent[],
   * }} io - File system adapters.
   * @param {{ info: (message: string) => void, warn: (message: string) => void }} messageLogger - Logger for status updates.
   * @returns {void}
   */
  function copyBrowserTrees(dirs, io, messageLogger) {
    const plans = [
      {
        src: dirs.srcBrowserDir,
        dest: dirs.publicBrowserDir,
        successMessage: 'Browser files copied successfully!',
        missingMessage: `Warning: browser directory not found at ${formatPathForLog(
          dirs.srcBrowserDir
        )}`,
      },
      {
        src: dirs.srcCoreBrowserDir,
        dest: dirs.publicCoreBrowserDir,
        successMessage: 'Core browser files copied successfully!',
        missingMessage: `Warning: core/browser directory not found at ${formatPathForLog(
          dirs.srcCoreBrowserDir
        )}`,
      },
    ];

    plans.forEach(plan => {
      copyDirectoryTreeIfExists(plan, io, messageLogger);
    });
  }

  /**
   * Copy root-level JavaScript modules from src/core into public/core.
   * @param {Record<string, string>} dirs - Directory map.
   * @param {{
   *   directoryExists: (target: string) => boolean,
   *   createDirectory: (target: string) => void,
   *   copyFile: (source: string, destination: string) => void,
   *   readDirEntries: (dir: string) => import('fs').Dirent[],
   * }} io - File system adapters.
   * @param {{ info: (message: string) => void, warn: (message: string) => void }} messageLogger - Logger for status updates.
   * @returns {void}
   */
  function copyCoreRootFiles(dirs, io, messageLogger) {
    if (!io.directoryExists(dirs.srcCoreDir)) {
      messageLogger.warn(
        `Warning: core directory not found at ${formatPathForLog(
          dirs.srcCoreDir
        )}`
      );
      return;
    }

    const entries = io.readDirEntries(dirs.srcCoreDir);
    const rootFiles = entries.filter(
      entry => entry.isFile() && isCorrectJsFileEnding(entry.name)
    );

    rootFiles.forEach(entry => {
      const source = join(dirs.srcCoreDir, entry.name);
      const destination = join(dirs.publicCoreDir, entry.name);
      copyFileWithDirectories(io, { source, destination, messageLogger });
    });

    messageLogger.info('Core root scripts copied successfully!');
  }

  /**
   * Execute the full copy workflow for the static site.
   * @param {{
   *   directories: Record<string, string>,
   *   io: {
   *     directoryExists: (target: string) => boolean,
   *     createDirectory: (target: string) => void,
   *     copyFile: (source: string, destination: string) => void,
   *     readDirEntries: (dir: string) => import('fs').Dirent[],
   *   },
   *   messageLogger: { info: (message: string) => void, warn: (message: string) => void },
   * }} context - Copy execution context.
   * @returns {void}
   */
  function runCopyWorkflow({ directories: dirs, io, messageLogger }) {
    ensureDirectoryExists(io, dirs.publicDir);
    copyBrowserTrees(dirs, io, messageLogger);
    copyCoreRootFiles(dirs, io, messageLogger);
  }

  return buildCopyExportMap([
    ['runCopyWorkflow', runCopyWorkflow],
    ['copyBrowserTrees', copyBrowserTrees],
    ['copyCoreRootFiles', copyCoreRootFiles],
    ['copyDirectoryTreeIfExists', copyDirectoryTreeIfExists],
    ['copyDirRecursive', copyDirRecursive],
    ['processDirectoryEntries', processDirectoryEntries],
    ['handleDirectoryEntry', handleDirectoryEntry],
    ['copyFilePairs', copyFilePairs],
    ['copyFileWithDirectories', copyFileWithDirectories],
    ['ensureDirectoryExists', ensureDirectoryExists],
    ['createCopyPairs', createCopyPairs],
    ['findJsFiles', findJsFiles],
    ['accumulateJsFiles', accumulateJsFiles],
    ['getPossibleNewFiles', getPossibleNewFiles],
    ['getActualNewFiles', getActualNewFiles],
    ['shouldCheckEntry', shouldCheckEntry],
    ['isJsFile', isJsFile],
    ['isCorrectJsFileEnding', isCorrectJsFileEnding],
    ['formatPathForLog', formatPathForLog],
  ]);
}
