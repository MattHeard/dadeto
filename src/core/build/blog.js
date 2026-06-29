import {
  buildCopyLogMessage,
  formatPathRelativeToProject,
  forEachMappedEntries,
  runMappedEntries,
} from '../commonCore.js';
import path from 'node:path';
export {
  selectReadablePath,
  formatPathRelativeToProject,
} from '../commonCore.js';

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
 * Build the base directory map used by the copy generator.
 * @param {{ projectRoot: string, srcDir: string, publicDir: string }} baseDirectories
 *   - Base project directories.
 * @param {Array<[string, string]>} sharedDirectoryEntries - Shared directory entries.
 * @returns {Record<string, string>} Directory map with shared source and destination paths.
 */
export function createCopyDirectories(baseDirectories, sharedDirectoryEntries) {
  const { projectRoot, srcDir, publicDir } = baseDirectories;
  const sharedEntries = Object.fromEntries(sharedDirectoryEntries);

  return {
    projectRoot,
    srcDir,
    publicDir,
    ...sharedEntries,
  };
}

/**
 * Build the complete directory map for the static-site copy workflow.
 * @param {{
 *   path: { join: typeof import('path').join },
 *   projectRoot: string,
 *   srcDir: string,
 *   publicDir: string,
 * }} options - Path helpers and base project directories.
 * @returns {Record<string, string>} Complete static-site copy directory map.
 */
export function createStaticSiteCopyDirectories({
  path: pathDeps,
  projectRoot,
  srcDir,
  publicDir,
}) {
  const sharedDirectoryEntries = createSharedDirectoryEntries({
    path: { join: pathDeps.join },
    srcDir,
    publicDir,
  });

  return {
    ...createCopyDirectories(
      { projectRoot, srcDir, publicDir },
      sharedDirectoryEntries
    ),
    srcBrowserAssetsDir: pathDeps.join(srcDir, 'browser', 'assets'),
    srcContentBlogMediaDir: pathDeps.join(srcDir, 'content', 'blog-media'),
    srcContentPagesDir: pathDeps.join(srcDir, 'content', 'pages'),
  };
}

/**
 * Build a copy workflow logger from a console-like object.
 * @param {{
 *   log: (message: string) => void,
 *   warn: (message: string) => void,
 * }} consoleLike - Console-compatible logging dependency.
 * @returns {{ info: (message: string) => void, warn: (message: string) => void }} Copy workflow logger.
 */
export function createConsoleMessageLogger(consoleLike) {
  return {
    info: message => consoleLike.log(message),
    warn: message => consoleLike.warn(message),
  };
}

/**
 * Determine whether a filename represents a copyable JS module.
 * @param {string} entryName Directory entry name.
 * @returns {boolean} True when the file should be copied.
 */
function isCorrectJsFileEnding(entryName) {
  return entryName.endsWith('.js') && !entryName.endsWith('.test.js');
}

/**
 * Create copy plans mapping source JS files to their destinations.
 * @param {string[]} files Source file paths.
 * @param {{ sourceRoot: string, destinationRoot: string }} roots Source and destination roots.
 * @param {(from: string, to: string) => string} join Path join helper.
 * @param {(from: string, to: string) => string} relative Path relative helper.
 * @returns {Array<{ source: string, destination: string }>} Copy instructions.
 */
function createCopyPairs(files, roots, join, relative) {
  const { sourceRoot, destinationRoot } = roots;
  return files.map(filePath => ({
    source: filePath,
    destination: join(destinationRoot, relative(sourceRoot, filePath)),
  }));
}

/**
 * Ensure the destination directory exists before copying files.
 * @param {{ directoryExists: (target: string) => boolean, createDirectory: (target: string) => void }} io Directory management helpers.
 * @param {string} targetDir Directory that must be present.
 * @returns {void}
 */
function ensureDirectoryExists(io, targetDir) {
  if (!io.directoryExists(targetDir)) {
    io.createDirectory(targetDir);
  }
}

/**
 * Check whether a directory entry is a JS file that can be copied.
 * @param {import('fs').Dirent} entry Directory entry to inspect.
 * @returns {boolean} True when the entry is a JS file.
 */
function isJsFile(entry) {
  return entry.isFile() && isCorrectJsFileEnding(entry.name);
}

/**
 * Determine if the entry warrants a recursive or file-level check.
 * @param {import('fs').Dirent} entry Directory entry to test.
 * @returns {boolean} True when the entry should be processed further.
 */
function shouldCheckEntry(entry) {
  return entry.isDirectory() || isJsFile(entry);
}

/**
 * Resolve new files discovered from a directory entry.
 * @param {import('fs').Dirent} entry Directory entry encountered.
 * @param {string} fullPath Absolute path to the entry.
 * @param {(dir: string) => import('fs').Dirent[]} listEntries Directory reader.
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
 * @param {import('fs').Dirent} entry Directory entry to evaluate.
 * @param {string} fullPath Absolute path to the entry.
 * @param {(dir: string) => import('fs').Dirent[]} listEntries Directory reader.
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
 * @param {string[]} jsFiles Accumulated JS files.
 * @param {import('fs').Dirent} entry Directory entry to inspect.
 * @param {{ dir: string, listEntries: (dir: string) => import('fs').Dirent[] }} context Directory context.
 * @returns {string[]} Updated list of JS files.
 */
function accumulateJsFiles(jsFiles, entry, context) {
  const { dir, listEntries } = context;
  const fullPath = path.join(dir, entry.name);
  const newFiles = getPossibleNewFiles(entry, fullPath, listEntries);
  return jsFiles.concat(newFiles);
}

/**
 * Recursively find JS files beneath the provided directory.
 * @param {string} dir Root directory to inspect.
 * @param {(dir: string) => import('fs').Dirent[]} listEntries Directory reader.
 * @returns {string[]} JS file paths discovered within the directory tree.
 */
function findJsFiles(dir, listEntries) {
  const entries = listEntries(dir);
  return entries.reduce(
    (jsFiles, entry) => accumulateJsFiles(jsFiles, entry, { dir, listEntries }),
    /** @type {string[]} */ ([])
  );
}

/**
 * Copy entries using a resolver and bound copy function.
 * @param {Array<{ source: string, destination: string }>} entries Entries to copy.
 * @param {{
 *   directoryExists: (target: string) => boolean,
 *   createDirectory: (target: string) => void,
 *   copyFile: (source: string, destination: string) => void,
 *   readDirEntries: (dir: string) => import('fs').Dirent[],
 * }} io FS adapters.
 * @param {{
 *   resolveMessage: (entry: { source: string, destination: string }) => string,
 *   copyFile: (source: string, destination: string, message?: string) => void,
 * }} options Logger and message builder.
 * @returns {Promise<void>} Copy operation promise.
 */
async function copyEntries(entries, io, { resolveMessage, copyFile }) {
  await runMappedEntries(
    entries,
    ({ source, destination }) => ({
      source,
      destination,
      message: resolveMessage({ source, destination }),
    }),
    async ({ source, destination, message }) => {
      copyFile(source, destination, message);
    }
  );
}

/**
 * Copy a directory entry, recursing into subdirectories as needed.
 * @param {import('fs').Dirent} entry Directory entry to copy.
 * @param {{ src: string, dest: string }} directories Source and destination directory paths.
 * @param {{
 *   io: {
 *     directoryExists: (target: string) => boolean,
 *     createDirectory: (target: string) => void,
 *     removeDirectory: (target: string) => void,
 *     copyFile: (source: string, destination: string) => void,
 *     readDirEntries: (dir: string) => import('fs').Dirent[],
 *   },
 *   messageLogger: { info: (message: string) => void },
 *   copyFile: (source: string, destination: string, message?: string) => void,
 * }} context File system adapters and logger for status updates.
 * @returns {void}
 */
function handleDirectoryEntry(entry, directories, context) {
  const { src, dest } = directories;
  const srcPath = path.join(src, entry.name);
  const destPath = path.join(dest, entry.name);
  if (entry.isDirectory()) {
    copyDirRecursive({ src: srcPath, dest: destPath }, context);
    return;
  }
  context.copyFile(srcPath, destPath);
}

/**
 * Iterate through directory entries and copy each one.
 * @param {import('fs').Dirent[]} entries Directory entries to copy.
 * @param {{ src: string, dest: string }} directories Source and destination directory paths.
 * @param {{
 *   io: {
 *     directoryExists: (target: string) => boolean,
 *     createDirectory: (target: string) => void,
 *     removeDirectory: (target: string) => void,
 *     copyFile: (source: string, destination: string) => void,
 *     readDirEntries: (dir: string) => import('fs').Dirent[],
 *   },
 *   messageLogger: { info: (message: string) => void },
 *   copyFile: (source: string, destination: string, message?: string) => void,
 * }} context File system adapters and logger for status updates.
 * @returns {void}
 */
function processDirectoryEntries(entries, directories, context) {
  entries.forEach(entry => {
    handleDirectoryEntry(entry, directories, context);
  });
}

/**
 * Recursively copy the contents of a directory.
 * @param {{ src: string, dest: string }} directories Source and destination directory paths.
 * @param {{
 *   io: {
 *     directoryExists: (target: string) => boolean,
 *     createDirectory: (target: string) => void,
 *     removeDirectory: (target: string) => void,
 *     copyFile: (source: string, destination: string) => void,
 *     readDirEntries: (dir: string) => import('fs').Dirent[],
 *   },
 *   messageLogger: { info: (message: string) => void },
 *   copyFile: (source: string, destination: string, message?: string) => void,
 * }} context File system adapters and logger for status updates.
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
 * Create helpers that orchestrate copying source assets into the public tree.
 * @param {object} options - File system dependencies.
 * @param {() => {
 *   directoryExists: (target: string) => boolean,
 *   createDirectory: (target: string) => void,
 *   removeDirectory: (target: string) => void,
 *   copyFile: (source: string, destination: string) => void,
 *   readDirEntries: (dir: string) => import('fs').Dirent[],
 * }} [options.createFsAdapters] - Optional factory for filesystem adapters.
 * @param {() => Pick<typeof import('path'), 'join' | 'dirname' | 'relative'>} options.createPathAdapters
 *   - Path helper factory.
 * @param {{ log: (message: string) => void, warn: (message: string) => void }} [options.console]
 *   - Optional default console-compatible logger.
 * @param {string} options.projectRoot - Project root directory.
 * @param {string} options.publicDir - Public output directory.
 * @param {string} options.srcDir - Source directory.
 * @returns {Record<string, Function>} Copy helper functions.
 */
export function createCopyCore({
  console: defaultConsole,
  createFsAdapters,
  createPathAdapters,
  projectRoot,
  publicDir,
  srcDir,
}) {
  const pathDeps = createPathAdapters();
  const { join, dirname, relative } = pathDeps;
  const dirConfig = createStaticSiteCopyDirectories({
    path: pathDeps,
    projectRoot,
    srcDir,
    publicDir,
  });

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
   * Copy a directory tree when the source exists, logging missing directories.
   * @param {{
   *   src: string,
   *   dest: string,
   *   successMessage: string,
   *   missingMessage: string,
   * }} plan - Copy plan describing the directory tree.
   * @param {{
   *   io: {
   *     directoryExists: (target: string) => boolean,
   *     createDirectory: (target: string) => void,
   *     removeDirectory: (target: string) => void,
   *     copyFile: (source: string, destination: string) => void,
   *     readDirEntries: (dir: string) => import('fs').Dirent[],
   *   },
   *   messageLogger: { info: (message: string) => void, warn: (message: string) => void },
   *   copyFile: (source: string, destination: string, message?: string) => void,
   * }} context File system adapters, logger, and bound copier.
   * @returns {void}
   */
  function copyDirectoryTreeIfExists(plan, context) {
    const { io, messageLogger, copyFile } = context;
    const { src, dest, successMessage, missingMessage } = plan;
    if (!io.directoryExists(src)) {
      messageLogger.warn(missingMessage);
      return;
    }
    copyDirRecursive({ src, dest }, { io, messageLogger, copyFile });
    messageLogger.info(successMessage);
  }

  /**
   * Copy a collection of directory tree plans.
   * @param {Array<{
   *   src: string,
   *   dest: string,
   *   successMessage: string,
   *   missingMessage: string,
   * }>} plans Directory tree copy plans.
   * @param {{
   *   io: {
   *     directoryExists: (target: string) => boolean,
   *     createDirectory: (target: string) => void,
   *     removeDirectory: (target: string) => void,
   *     copyFile: (source: string, destination: string) => void,
   *     readDirEntries: (dir: string) => import('fs').Dirent[],
   *   },
   *   messageLogger: { info: (message: string) => void, warn: (message: string) => void },
   *   copyFile: (source: string, destination: string, message?: string) => void,
   * }} context File system adapters, logger, and bound copier.
   * @returns {void}
   */
  function copyPlannedDirectoryTrees(plans, context) {
    forEachMappedEntries(
      plans,
      plan => plan,
      plan => {
        copyDirectoryTreeIfExists(plan, context);
      }
    );
  }

  /**
   * Copy planned directory trees from compact tuples.
   * @param {Array<[string, string, string, string]>} entries Directory plan tuples.
   * @param {{
   *   io: {
   *     directoryExists: (target: string) => boolean,
   *     createDirectory: (target: string) => void,
   *     removeDirectory: (target: string) => void,
   *     copyFile: (source: string, destination: string) => void,
   *     readDirEntries: (dir: string) => import('fs').Dirent[],
   *   },
   *   messageLogger: { info: (message: string) => void, warn: (message: string) => void },
   *   copyFile: (source: string, destination: string, message?: string) => void,
   * }} context File system adapters, logger, and bound copier.
   * @returns {void}
   */
  function copyPlannedDirectoryTreesFromTuples(entries, context) {
    copyPlannedDirectoryTrees(buildDirectoryCopyPlans(entries), context);
  }

  /**
   * Build directory copy plans from a compact tuple form.
   * @param {Array<[string, string, string, string]>} entries Directory plan tuples.
   * @returns {Array<{ src: string, dest: string, successMessage: string, missingMessage: string }>} Copy plans.
   */
  function buildDirectoryCopyPlans(entries) {
    return entries.map(([src, dest, successMessage, missingLabel]) => ({
      src,
      dest,
      successMessage,
      missingMessage: `Warning: ${missingLabel} at ${formatPathForLog(src)}`,
    }));
  }

  /**
   * Build the directory copy plans for browser trees.
   * @param {Record<string, string>} dirs Directory map.
   * @returns {Array<[string, string, string, string]>} Browser tree plan tuples.
   */
  function buildBrowserTreePlans(dirs) {
    return [
      [
        dirs.srcBrowserDir,
        dirs.publicBrowserDir,
        'Browser files copied successfully!',
        'browser directory not found',
      ],
      [
        dirs.srcCoreBrowserDir,
        dirs.publicCoreBrowserDir,
        'Core browser files copied successfully!',
        'core/browser directory not found',
      ],
    ];
  }

  /**
   * Build the directory copy plans for static content trees.
   * @param {Record<string, string>} dirs Directory map.
   * @returns {Array<[string, string, string, string]>} Static content plan tuples.
   */
  function buildStaticContentTreePlans(dirs) {
    return [
      [
        dirs.srcBrowserAssetsDir,
        dirs.publicDir,
        'Browser assets copied successfully!',
        'browser/assets directory not found',
      ],
      [
        dirs.srcContentBlogMediaDir,
        dirs.publicDir,
        'Blog media copied successfully!',
        'content/blog-media directory not found',
      ],
      [
        dirs.srcContentPagesDir,
        dirs.publicDir,
        'Content pages copied successfully!',
        'content/pages directory not found',
      ],
    ];
  }

  /**
   * Copy one or more browser-related directory trees into the public browser directory.
   * @param {Record<string, string>} dirs - Directory map.
   * @param {{
   *   io: {
   *     directoryExists: (target: string) => boolean,
   *     createDirectory: (target: string) => void,
   *     removeDirectory: (target: string) => void,
   *     copyFile: (source: string, destination: string) => void,
   *     readDirEntries: (dir: string) => import('fs').Dirent[],
   *   },
   *   messageLogger: { info: (message: string) => void, warn: (message: string) => void },
   *   copyFile: (source: string, destination: string, message?: string) => void,
   * }} context File system adapters, logger, and bound copier.
   * @returns {void}
   */
  function copyBrowserTrees(dirs, context) {
    copyPlannedDirectoryTreesFromTuples(buildBrowserTreePlans(dirs), context);
  }

  /**
   * Copy root-level JavaScript modules from src/core into public/core.
   * @param {Record<string, string>} dirs - Directory map.
   * @param {{
   *   io: {
   *     directoryExists: (target: string) => boolean,
   *     createDirectory: (target: string) => void,
   *     removeDirectory: (target: string) => void,
   *     copyFile: (source: string, destination: string) => void,
   *     readDirEntries: (dir: string) => import('fs').Dirent[],
   *   },
   *   messageLogger: { info: (message: string) => void, warn: (message: string) => void },
   *   copyFile: (source: string, destination: string, message?: string) => void,
   * }} context File system adapters, logger, and bound copier.
   * @returns {void}
   */
  function copyCoreRootFiles(dirs, context) {
    const { io, messageLogger, copyFile } = context;
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
      copyFile(source, destination);
    });

    messageLogger.info('Core root scripts copied successfully!');
  }

  /**
   * Copy the shared core constants directory into the public tree.
   * @param {Record<string, string>} dirs - Directory map.
   * @param {{
   *   io: {
   *     directoryExists: (target: string) => boolean,
   *     createDirectory: (target: string) => void,
   *     removeDirectory: (target: string) => void,
   *     copyFile: (source: string, destination: string) => void,
   *     readDirEntries: (dir: string) => import('fs').Dirent[],
   *   },
   *   messageLogger: { info: (message: string) => void, warn: (message: string) => void },
   *   copyFile: (source: string, destination: string, message?: string) => void,
   * }} context File system adapters, logger, and bound copier.
   * @returns {void}
   */
  function copyCoreConstants(dirs, context) {
    const constantsDir = join(dirs.srcCoreDir, 'constants');
    copyDirectoryTreeIfExists(
      {
        src: constantsDir,
        dest: join(dirs.publicCoreDir, 'constants'),
        successMessage: 'Core constants copied successfully!',
        missingMessage: `Warning: core/constants directory not found at ${formatPathForLog(
          constantsDir
        )}`,
      },
      context
    );
  }

  /**
   * Copy generated static content trees into the public root.
   * @param {Record<string, string>} dirs - Directory map.
   * @param {{
   *   io: {
   *     directoryExists: (target: string) => boolean,
   *     createDirectory: (target: string) => void,
   *     removeDirectory: (target: string) => void,
   *     copyFile: (source: string, destination: string) => void,
   *     readDirEntries: (dir: string) => import('fs').Dirent[],
   *   },
   *   messageLogger: { info: (message: string) => void, warn: (message: string) => void },
   *   copyFile: (source: string, destination: string, message?: string) => void,
   * }} context File system adapters, logger, and bound copier.
   * @returns {void}
   */
  function copyStaticContentTrees(dirs, context) {
    copyPlannedDirectoryTreesFromTuples(
      buildStaticContentTreePlans(dirs),
      context
    );
  }

  /**
   * Resolve the filesystem adapter bundle used by the copy workflow.
   * @returns {{ directoryExists: (target: string) => boolean, createDirectory: (target: string) => void, removeDirectory: (target: string) => void, copyFile: (source: string, destination: string) => void, readDirEntries: (dir: string) => import('fs').Dirent[] }} Filesystem adapter bundle.
   */
  function resolveCopyWorkflowFsAdapters() {
    if (typeof createFsAdapters !== 'function') {
      throw new Error('Missing createFsAdapters dependency for copy workflow.');
    }

    return createFsAdapters();
  }

  /**
   * Execute the full copy workflow for the static site.
   * @returns {void}
   */
  function runCopyWorkflow() {
    const dirs = dirConfig;
    const io = resolveCopyWorkflowFsAdapters();
    const messageLogger = createConsoleMessageLogger(defaultConsole || console);
    const copyFile =
      /** @type {(source: string, destination: string, message?: string) => void} */ (
        function copyFile(source, destination, message) {
          copyFileWithDirectories({
            io,
            source,
            destination,
            messageLogger,
            formatPathForLog,
            ensureDirectoryExists,
            dirname,
            message,
          });
        }
      );
    io.removeDirectory(dirs.publicDir);
    ensureDirectoryExists(io, dirs.publicDir);
    const copyContext = { io, messageLogger, copyFile };
    copyBrowserTrees(dirs, copyContext);
    copyCoreRootFiles(dirs, copyContext);
    copyCoreConstants(dirs, { io, messageLogger, copyFile });
    copyStaticContentTrees(dirs, copyContext);
    copyBlogJson({
      directories: dirs,
      copyFile,
      io,
      messageLogger,
      join,
      formatPathForLog,
      ensureDirectoryExists,
      dirname,
    });
  }

  return /** @type {Record<string, Function>} */ (
    Object.fromEntries([
      ['runCopyWorkflow', runCopyWorkflow],
      ['copyBrowserTrees', copyBrowserTrees],
      ['copyCoreRootFiles', copyCoreRootFiles],
      ['copyCoreConstants', copyCoreConstants],
      ['copyBlogJson', copyBlogJson],
      ['copyPlannedDirectoryTrees', copyPlannedDirectoryTrees],
      ['copyDirectoryTreeIfExists', copyDirectoryTreeIfExists],
      ['copyDirRecursive', copyDirRecursive],
      ['processDirectoryEntries', processDirectoryEntries],
      ['handleDirectoryEntry', handleDirectoryEntry],
      ['copyFilePairs', copyFilePairs],
      ['copyEntries', copyEntries],
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
    ])
  );
}

/**
 * Copy the generated blog JSON payload from src/build into the public root.
 * @param {{
 *   directories: Record<string, string>,
 *   io: {
 *     directoryExists: (target: string) => boolean,
 *     createDirectory: (target: string) => void,
 *     removeDirectory: (target: string) => void,
 *     copyFile: (source: string, destination: string) => void,
 *     readDirEntries: (dir: string) => import('fs').Dirent[],
 *   },
 *   messageLogger: { info: (message: string) => void, warn: (message: string) => void },
 *   join: typeof import('path').join,
 *   copyFile: (source: string, destination: string, message?: string) => void,
 *   formatPathForLog: (targetPath: string) => string,
 *   ensureDirectoryExists: (
 *     io: {
 *       directoryExists: (target: string) => boolean,
 *       createDirectory: (target: string) => void,
 *       copyFile: (source: string, destination: string) => void,
 *     },
 *     targetDir: string,
 *   ) => void,
 *   dirname: typeof import('path').dirname,
 * }} options Blog copy context.
 * @returns {void}
 */
function copyBlogJson({
  directories: dirs,
  copyFile,
  io,
  messageLogger,
  join,
  formatPathForLog,
}) {
  const buildDir = join(dirs.srcDir, 'build');
  if (io.directoryExists(buildDir)) {
    const source = join(buildDir, 'blog.json');
    const destination = join(dirs.publicDir, 'blog.json');
    const message = `Blog data copied from ${formatPathForLog(source)} to ${formatPathForLog(
      destination
    )}`;

    copyFile(source, destination, message);
    return;
  }

  messageLogger.warn(
    `Warning: build directory not found at ${formatPathForLog(buildDir)}`
  );
}

/**
 * Execute a list of copy operations.
 * @param {{
 *   copyPairs: Array<{ source: string, destination: string }>,
 *   io: {
 *     directoryExists: (target: string) => boolean,
 *     createDirectory: (target: string) => void,
 *     copyFile: (source: string, destination: string) => void,
 *   },
 *   messageLogger: { info: (message: string) => void },
 *   copyFile: (source: string, destination: string) => void,
 * }} options Copy operation details.
 * @returns {void}
 */
function copyFilePairs({ copyPairs, copyFile }) {
  copyPairs.forEach(({ source, destination }) => {
    copyFile(source, destination);
  });
}

/**
 * Copy a file and ensure supporting directories exist.
 * @param {{
 *   io: {
 *     directoryExists: (target: string) => boolean,
 *     createDirectory: (target: string) => void,
 *     copyFile: (source: string, destination: string) => void,
 *   },
 *   source: string,
 *   destination: string,
 *   messageLogger: { info: (message: string) => void },
 *   formatPathForLog: (targetPath: string) => string,
 *   ensureDirectoryExists: (
 *     io: {
 *       directoryExists: (target: string) => boolean,
 *       createDirectory: (target: string) => void,
 *       copyFile: (source: string, destination: string) => void,
 *     },
 *     targetDir: string,
 *   ) => void,
 *   dirname: typeof import('path').dirname,
 *   message?: string,
 * }} options File copy configuration.
 * @returns {void}
 */
function copyFileWithDirectories({
  io,
  source,
  destination,
  messageLogger,
  formatPathForLog,
  ensureDirectoryExists,
  dirname,
  message,
}) {
  ensureDirectoryExists(io, dirname(destination));
  io.copyFile(source, destination);
  messageLogger.info(
    buildCopyLogMessage({
      formatPathForLog,
      sourceDestination: {
        source,
        destination,
      },
      message,
    })
  );
}

/**
 * Create a task that copies a single entry.
 * @param {{
 *   io: {
 *     directoryExists: (target: string) => boolean,
 *     createDirectory: (target: string) => void,
 *     copyFile: (source: string, destination: string) => void,
 *   },
 *   messageLogger: { info: (message: string) => void },
 *   resolveMessage: (entry: { source: string, destination: string }) => string,
 *   copyFileWithDirectories: (
 *     io: {
 *       directoryExists: (target: string) => boolean,
 *       createDirectory: (target: string) => void,
 *       copyFile: (source: string, destination: string) => void,
 *     },
 *     options: {
 *       source: string,
 *       destination: string,
 *       messageLogger: { info: (message: string) => void },
 *       message?: string,
 *     }
 *   ) => void,
 * }} options Task factory dependencies.
 * @returns {(entry: { source: string, destination: string }) => Promise<void>} Copy task.
 */
