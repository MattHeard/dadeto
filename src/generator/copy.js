#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define base directories
const projectRoot = path.resolve(__dirname, '../..'); // Adjust based on script location
const srcDir = path.resolve(projectRoot, 'src');
const publicDir = path.resolve(projectRoot, 'public');
const srcToysDir = path.resolve(srcDir, 'toys');
const srcBrowserDir = path.resolve(srcDir, 'browser');
const publicBrowserDir = path.join(publicDir, 'browser');
const srcUtilsDir = path.resolve(srcDir, 'utils');
const publicUtilsDir = path.join(publicDir, 'utils');

// New directory with handlers used by interactive components
const srcInputHandlersDir = path.resolve(srcDir, 'inputHandlers');
const publicInputHandlersDir = path.join(publicDir, 'inputHandlers');
const srcConstantsDir = path.resolve(srcDir, 'constants');
const publicConstantsDir = path.join(publicDir, 'constants');
const srcAssetsDir = path.resolve(srcDir, 'assets');
const publicAssetsDir = publicDir;
const srcPresentersDir = path.resolve(srcDir, 'presenters');
const publicPresentersDir = path.join(publicDir, 'presenters');
const srcBlogJson = path.join(srcDir, 'blog.json');
const publicBlogJson = path.join(publicDir, 'blog.json');

const directories = {
  projectRoot,
  srcDir,
  publicDir,
  srcToysDir,
  srcBrowserDir,
  publicBrowserDir,
  srcUtilsDir,
  publicUtilsDir,
  srcInputHandlersDir,
  publicInputHandlersDir,
  srcConstantsDir,
  publicConstantsDir,
  srcAssetsDir,
  publicAssetsDir,
  srcPresentersDir,
  publicPresentersDir,
  srcBlogJson,
  publicBlogJson,
};

const thirdParty = {
  directoryExists: target => fs.existsSync(target),
  createDirectory: target => fs.mkdirSync(target, { recursive: true }),
  copyFile: (source, destination) => fs.copyFileSync(source, destination),
  readDirEntries: dir => fs.readdirSync(dir, { withFileTypes: true }),
};

const logger = {
  info: message => console.log(message),
  warn: message => console.warn(message),
};

/**
 * Format an absolute path so log messages display it relative to the project root.
 * @param {string} targetPath - Absolute path to format for logging.
 * @returns {string} Relative path when available, otherwise the original path.
 */
function formatPathForLog(targetPath) {
  const relativePath = path.relative(directories.projectRoot, targetPath);
  if (!relativePath) {
    return '.';
  }
  if (relativePath.startsWith('..')) {
    return targetPath;
  }
  return relativePath;
}

// --- Core utilities ------------------------------------------------------

/**
 * Determine if an entry has a valid JavaScript file name.
 * @param {string} entryName - Directory entry name to check.
 * @returns {boolean} `true` for non-test `.js` files.
 */
function isCorrectJsFileEnding(entryName) {
  return entryName.endsWith('.js') && !entryName.endsWith('.test.js');
}

/**
 * Check if a directory entry is a JavaScript file.
 * @param {fs.Dirent} entry - Entry to evaluate.
 * @returns {boolean} Whether the entry is a JS file.
 */
function isJsFile(entry) {
  return entry.isFile() && isCorrectJsFileEnding(entry.name);
}

/**
 * Determine if a directory entry should be inspected.
 * @param {fs.Dirent} entry - Entry to inspect.
 * @returns {boolean} `true` if the entry may contain JS files.
 */
function shouldCheckEntry(entry) {
  return entry.isDirectory() || isJsFile(entry);
}

/**
 * Resolve the files represented by a directory entry.
 * @param {fs.Dirent} entry - Directory entry.
 * @param {string} fullPath - Full path to the entry.
 * @param {(dir: string) => fs.Dirent[]} listEntries - Function to read directory contents.
 * @returns {string[]} New file paths discovered.
 */
function getActualNewFiles(entry, fullPath, listEntries) {
  if (entry.isDirectory()) {
    return findJsFiles(fullPath, listEntries);
  }
  return [fullPath];
}

/**
 * Get potential JavaScript files from an entry.
 * @param {fs.Dirent} entry - Directory entry.
 * @param {string} fullPath - Full path to the entry.
 * @param {(dir: string) => fs.Dirent[]} listEntries - Function to read directory contents.
 * @returns {string[]} File paths to include.
 */
function getPossibleNewFiles(entry, fullPath, listEntries) {
  if (shouldCheckEntry(entry)) {
    return getActualNewFiles(entry, fullPath, listEntries);
  }
  return [];
}

/**
 * Accumulate JavaScript file paths from a directory entry.
 * @param {string[]} jsFiles - Array of discovered files.
 * @param {fs.Dirent} entry - Current directory entry.
 * @param {string} dir - Directory being scanned.
 * @param {(dir: string) => fs.Dirent[]} listEntries - Function to read directory contents.
 * @returns {string[]} Updated array of file paths.
 */
function accumulateJsFiles(jsFiles, entry, dir, listEntries) {
  const fullPath = path.join(dir, entry.name);
  const newFiles = getPossibleNewFiles(entry, fullPath, listEntries);
  return jsFiles.concat(newFiles);
}

/**
 * Recursively find JavaScript files in a directory.
 * @param {string} dir - Directory to search.
 * @param {(dir: string) => fs.Dirent[]} listEntries - Function to read directory contents.
 * @returns {string[]} All JS file paths.
 */
function findJsFiles(dir, listEntries) {
  const entries = listEntries(dir);
  return entries.reduce(
    (jsFiles, entry) => accumulateJsFiles(jsFiles, entry, dir, listEntries),
    []
  );
}

/**
 * Convert absolute file paths into copy pairs relative to the provided source.
 * @param {string[]} files - Absolute file paths.
 * @param {string} sourceRoot - Root directory to compute relative paths from.
 * @param {string} destinationRoot - Destination root directory.
 * @returns {{source: string, destination: string}[]} Copy pair definitions.
 */
function createCopyPairs(files, sourceRoot, destinationRoot) {
  return files.map(filePath => ({
    source: filePath,
    destination: path.join(
      destinationRoot,
      path.relative(sourceRoot, filePath)
    ),
  }));
}

// --- Third-party dependent helpers --------------------------------------

/**
 * Ensure a directory exists by creating it when missing.
 * @param {typeof thirdParty} io - File system helpers.
 * @param {string} targetDir - Directory path to verify.
 * @returns {void}
 */
function ensureDirectoryExists(io, targetDir) {
  if (!io.directoryExists(targetDir)) {
    io.createDirectory(targetDir);
  }
}

/**
 * Copy a file and guarantee the destination directory exists.
 * @param {typeof thirdParty} io - File system helpers.
 * @param {string} source - Source file path.
 * @param {string} destination - Destination file path.
 * @param {typeof logger} messageLogger - Logger for status updates.
 * @param {string} [message] - Optional custom log message.
 * @returns {void}
 */
function copyFileWithDirectories(
  io,
  source,
  destination,
  messageLogger,
  message
) {
  ensureDirectoryExists(io, path.dirname(destination));
  io.copyFile(source, destination);
  const relativeSource = formatPathForLog(source);
  const relativeDestination = formatPathForLog(destination);
  const logMessage =
    message ?? `Copied: ${relativeSource} -> ${relativeDestination}`;
  messageLogger.info(logMessage);
}

/**
 * Copy each file pair using the provided I/O helpers.
 * @param {{source: string, destination: string}[]} copyPairs - Files to copy.
 * @param {typeof thirdParty} io - File system helpers.
 * @param {typeof logger} messageLogger - Logger for status updates.
 * @returns {void}
 */
function copyFilePairs(copyPairs, io, messageLogger) {
  copyPairs.forEach(({ source, destination }) => {
    copyFileWithDirectories(io, source, destination, messageLogger);
  });
}

/**
 * Process a directory entry during recursive copy.
 * @param {fs.Dirent} entry - Entry to copy.
 * @param {string} src - Source directory path.
 * @param {string} dest - Destination directory path.
 * @param {typeof thirdParty} io - File system helpers.
 * @param {typeof logger} messageLogger - Logger for status updates.
 * @returns {void}
 */
function handleDirectoryEntry(entry, src, dest, io, messageLogger) {
  const srcPath = path.join(src, entry.name);
  const destPath = path.join(dest, entry.name);
  if (entry.isDirectory()) {
    copyDirRecursive(srcPath, destPath, io, messageLogger);
    return;
  }
  copyFileWithDirectories(io, srcPath, destPath, messageLogger);
}

/**
 * Process and copy an array of directory entries.
 * @param {fs.Dirent[]} entries - Directory entries.
 * @param {string} src - Source directory path.
 * @param {string} dest - Destination directory path.
 * @param {typeof thirdParty} io - File system helpers.
 * @param {typeof logger} messageLogger - Logger for status updates.
 * @returns {void}
 */
function processDirectoryEntries(entries, src, dest, io, messageLogger) {
  entries.forEach(entry => {
    handleDirectoryEntry(entry, src, dest, io, messageLogger);
  });
}

/**
 * Recursively copy a directory to a destination.
 * @param {string} src - Source directory.
 * @param {string} dest - Destination directory.
 * @param {typeof thirdParty} io - File system helpers.
 * @param {typeof logger} messageLogger - Logger for status updates.
 * @returns {void}
 */
function copyDirRecursive(src, dest, io, messageLogger) {
  ensureDirectoryExists(io, dest);
  const entries = io.readDirEntries(src);
  processDirectoryEntries(entries, src, dest, io, messageLogger);
}

/**
 * Copy a directory tree when the source exists, otherwise warn.
 * @param {{src: string, dest: string, successMessage: string, missingMessage: string}} plan - Copy plan definition.
 * @param {typeof thirdParty} io - File system helpers.
 * @param {typeof logger} messageLogger - Logger for status updates.
 * @returns {void}
 */
function copyDirectoryTreeIfExists(plan, io, messageLogger) {
  const { src, dest, successMessage, missingMessage } = plan;
  if (!io.directoryExists(src)) {
    messageLogger.warn(missingMessage);
    return;
  }
  copyDirRecursive(src, dest, io, messageLogger);
  messageLogger.info(successMessage);
}

// --- Workflows combining core + third-party helpers ----------------------

/**
 * Copy src/blog.json into public/blog.json.
 * @param {typeof directories} dirs - Project directory paths.
 * @param {typeof thirdParty} io - File system helpers.
 * @param {typeof logger} messageLogger - Logger for status updates.
 * @returns {void}
 */
function copyBlogJson(dirs, io, messageLogger) {
  copyFileWithDirectories(
    io,
    dirs.srcBlogJson,
    dirs.publicBlogJson,
    messageLogger,
    'Copied: src/blog.json -> public/blog.json'
  );
}

/**
 * Copy toy JavaScript files into the public directory.
 * @param {typeof directories} dirs - Project directory paths.
 * @param {typeof thirdParty} io - File system helpers.
 * @param {typeof logger} messageLogger - Logger for status updates.
 * @returns {void}
 */
function copyToyFiles(dirs, io, messageLogger) {
  const toyFiles = findJsFiles(dirs.srcToysDir, io.readDirEntries);
  const copyPairs = createCopyPairs(toyFiles, dirs.srcToysDir, dirs.publicDir);
  copyFilePairs(copyPairs, io, messageLogger);
  messageLogger.info('Toy files copied successfully!');
}

/**
 * Copy presenter JavaScript files when the directory exists.
 * @param {typeof directories} dirs - Project directory paths.
 * @param {typeof thirdParty} io - File system helpers.
 * @param {typeof logger} messageLogger - Logger for status updates.
 * @returns {void}
 */
function copyPresenterFiles(dirs, io, messageLogger) {
  if (!io.directoryExists(dirs.srcPresentersDir)) {
    messageLogger.warn(
      `Warning: presenters directory not found at ${formatPathForLog(
        dirs.srcPresentersDir
      )}`
    );
    return;
  }
  const presenterFiles = findJsFiles(dirs.srcPresentersDir, io.readDirEntries);
  const presenterPairs = createCopyPairs(
    presenterFiles,
    dirs.srcPresentersDir,
    dirs.publicPresentersDir
  );
  presenterPairs.forEach(({ source, destination }) => {
    copyFileWithDirectories(
      io,
      source,
      destination,
      messageLogger,
      `Copied presenter: ${formatPathForLog(source)} -> ${formatPathForLog(
        destination
      )}`
    );
  });
  messageLogger.info('Presenter files copied successfully!');
}

/**
 * Copy supporting directories (utils, handlers, constants, assets, browser).
 * @param {typeof directories} dirs - Project directory paths.
 * @param {typeof thirdParty} io - File system helpers.
 * @param {typeof logger} messageLogger - Logger for status updates.
 * @returns {void}
 */
function copySupportingDirectories(dirs, io, messageLogger) {
  const plans = [
    {
      src: dirs.srcUtilsDir,
      dest: dirs.publicUtilsDir,
      successMessage: 'Utils files copied successfully!',
      missingMessage: `Warning: utils directory not found at ${formatPathForLog(
        dirs.srcUtilsDir
      )}`,
    },
    {
      src: dirs.srcInputHandlersDir,
      dest: dirs.publicInputHandlersDir,
      successMessage: 'Input handler files copied successfully!',
      missingMessage: `Warning: inputHandlers directory not found at ${formatPathForLog(
        dirs.srcInputHandlersDir
      )}`,
    },
    {
      src: dirs.srcConstantsDir,
      dest: dirs.publicConstantsDir,
      successMessage: 'Constants files copied successfully!',
      missingMessage: `Warning: constants directory not found at ${formatPathForLog(
        dirs.srcConstantsDir
      )}`,
    },
    {
      src: dirs.srcAssetsDir,
      dest: dirs.publicAssetsDir,
      successMessage: 'Asset files copied successfully!',
      missingMessage: `Warning: assets directory not found at ${formatPathForLog(
        dirs.srcAssetsDir
      )}`,
    },
    {
      src: dirs.srcBrowserDir,
      dest: dirs.publicBrowserDir,
      successMessage: 'Browser files copied successfully!',
      missingMessage: `Warning: browser directory not found at ${formatPathForLog(
        dirs.srcBrowserDir
      )}`,
    },
  ];

  plans.forEach(plan => {
    copyDirectoryTreeIfExists(plan, io, messageLogger);
  });
}

/**
 * Execute the copy workflow.
 * @param {typeof thirdParty} io - File system helpers.
 * @param {typeof logger} messageLogger - Logger for status updates.
 * @returns {void}
 */
function main(io, messageLogger) {
  ensureDirectoryExists(io, directories.publicDir);
  copyBlogJson(directories, io, messageLogger);
  copyToyFiles(directories, io, messageLogger);
  copyPresenterFiles(directories, io, messageLogger);
  copySupportingDirectories(directories, io, messageLogger);
}

main(thirdParty, logger);
