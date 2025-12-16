import { formatPathRelativeToProject } from '../copy.js';
import { buildCopyExportMap } from '../build/buildCore.js';
import { runInParallel } from './parallel-utils.js';

export const DEFAULT_COPYABLE_EXTENSIONS = ['.js', '.json'];

/**
 * @typedef {{ info: (message: string) => void }} CopyMessageLogger
 */

/**
 * @typedef {{
 *   ensureDirectory: (target: string) => Promise<void>,
 *   readDirEntries: (dir: string) => Promise<import('fs').Dirent[]>,
 *   copyFile: (source: string, destination: string) => Promise<void>,
 * }} CopyAsyncIo
 */

/**
 * @typedef {{ copyFile: (source: string, destination: string) => Promise<void> }} CopyIo
 */

/**
 * @typedef {{
 *   io: CopyIo,
 *   sourceDir: string,
 *   targetDir: string,
 *   name: string,
 *   messageLogger: CopyMessageLogger,
 * }} CopyFileToTargetOptions
 */

/**
 * @typedef {{
 *   ensureDirectory: (target: string) => Promise<void>,
 *   copyFile: (source: string, destination: string) => Promise<void>,
 * }} EnsureAndCopyIo
 */

/**
 * @typedef {{ source: string, target: string }} CopyPair
 */

/**
 * @typedef {{ sourceDir: string, targetDir: string, files: string[] }} DeclaredCopyPlan
 */

/**
 * @typedef {{
 *   directoryCopies: CopyPair[],
 *   fileCopies?: DeclaredCopyPlan,
 *   individualFileCopies?: CopyPair[],
 *   io: CopyAsyncIo,
 *   messageLogger: CopyMessageLogger,
 * }} RunCopyOptions
 */

/**
 * @typedef {{
 *   formatPathForLog: (targetPath: string) => string,
 *   isCopyableFile: (entry: import('fs').Dirent) => boolean,
 *   copyFileToTarget: (options: CopyFileToTargetOptions) => Promise<void>,
 *   copyDirectory: (
 *     copyPlan: CopyPair,
 *     io: CopyAsyncIo,
 *     messageLogger: CopyMessageLogger,
 *   ) => Promise<void>,
 *   copyDeclaredFiles: (
 *     copyPlan: DeclaredCopyPlan,
 *     io: EnsureAndCopyIo,
 *     messageLogger: CopyMessageLogger,
 *   ) => Promise<void>,
 *   copyIndividualFiles: (
 *     copies: CopyPair[],
 *     io: EnsureAndCopyIo,
 *     messageLogger: CopyMessageLogger,
 *   ) => Promise<void>,
 *   runCopyToInfra: (options: RunCopyOptions) => Promise<void>,
 * }} CopyToInfraHelpers
 */

/**
 * Create helpers for copying Cloud Function assets into the infra directory.
 * @param {{
 *   projectRoot: string,
 *   path: {
 *     join: typeof import('path').join,
 *     dirname: typeof import('path').dirname,
 *     relative: typeof import('path').relative,
 *     extname: typeof import('path').extname,
 *   },
 *   copyableExtensions?: string[],
 * }} options - Configuration for the copy workflow.
 * @returns {CopyToInfraHelpers} Copy helper utilities.
 */
export function createCopyToInfraCore({
  projectRoot,
  path: pathDeps,
  copyableExtensions = DEFAULT_COPYABLE_EXTENSIONS,
}) {
  const { join, dirname, relative, extname } = pathDeps;
  const extensionSet = new Set(copyableExtensions);

  /**
   * Format a path relative to the project root for log output.
   * @param {string} targetPath - Absolute path to format.
   * @returns {string} Relative path or the original when outside the project.
   */
  function formatPathForLog(targetPath) {
    return formatPathRelativeToProject(projectRoot, targetPath, relative);
  }

  /**
   * Check whether the directory entry represents a copyable file.
   * @param {import('fs').Dirent} entry - Directory entry to inspect.
   * @returns {boolean} True when the entry should be copied.
   */
  function isCopyableFile(entry) {
    return entry.isFile() && extensionSet.has(extname(entry.name));
  }

  /**
   * Copy a single file and log the operation.
   * @param {CopyFileToTargetOptions} options - Filesystem adapters and logging hooks.
   * @returns {Promise<void>} Resolves when the file is copied.
   */
  async function copyFileToTarget({
    io,
    sourceDir,
    targetDir,
    name,
    messageLogger,
  }) {
    const sourcePath = join(sourceDir, name);
    const destinationPath = join(targetDir, name);
    await io.copyFile(sourcePath, destinationPath);
    messageLogger.info(
      `Copied: ${formatPathForLog(sourcePath)} -> ${formatPathForLog(destinationPath)}`
    );
  }

  /**
   * Copy every supported file from a directory into the target path.
   * @param {{ source: string, target: string }} copyPlan - Absolute source and target paths.
   * @param {{
   *   ensureDirectory: (target: string) => Promise<void>,
   *   readDirEntries: (dir: string) => Promise<import('fs').Dirent[]>,
   *   copyFile: (source: string, destination: string) => Promise<void>,
   * }} io - Filesystem adapters.
   * @param {{ info: (message: string) => void }} messageLogger - Logger to report progress.
   * @returns {Promise<void>} Resolves when the directory has been processed.
   */
  async function copyDirectory(copyPlan, io, messageLogger) {
    const { source, target } = copyPlan;
    const sourceEntries = await io.readDirEntries(source);
    const fileNames = sourceEntries
      .filter(isCopyableFile)
      .map(entry => entry.name);
    await performCopy({
      files: fileNames,
      sourceDir: source,
      targetDir: target,
      io,
      messageLogger,
    });
  }

  /**
   * Extract the declared files from the copy plan.
   * @param {{ files?: string[] } | undefined} copyPlan - Copy configuration that may list files.
   * @returns {string[] | undefined} The declared files or undefined when none are provided.
   */
  function extractDeclaredFiles(copyPlan) {
    return copyPlan?.files;
  }

  /**
   * Check whether the provided value is a non-empty array.
   * @param {unknown} value - Value to inspect.
   * @returns {boolean} True when the value is an array with at least one item.
   */
  function isNonEmptyArray(value) {
    if (!Array.isArray(value)) {
      return false;
    }
    return value.length > 0;
  }

  /**
   * Determine whether the copy plan includes files to duplicate.
   * @param {{ files?: string[] } | undefined} copyPlan - Copy configuration that may omit files.
   * @returns {boolean} True when there are declared files.
   */
  function shouldCopyDeclaredFiles(copyPlan) {
    return isNonEmptyArray(extractDeclaredFiles(copyPlan));
  }

  /**
   * Copy files defined by a declared list.
   * @param {object} copyPlan - Copy configuration with source and target directories.
   * @param {object} io - Filesystem adapters.
   * @param {object} messageLogger - Logger to report progress.
   * @returns {Promise<void>} Resolves when the declared files are copied.
   */
  async function copyDeclaredFiles(copyPlan, io, messageLogger) {
    if (!shouldCopyDeclaredFiles(copyPlan)) {
      return;
    }
    const { sourceDir, targetDir } = copyPlan;
    const files = extractDeclaredFiles(copyPlan);
    const copyParams = {
      files,
      sourceDir,
      targetDir,
      io,
      messageLogger,
    };
    await performCopy(copyParams);
  }

  /**
   * Copy files defined by explicit source and target pairs.
   * @param {{ source: string, target: string }[]} copies - Array of copy instructions.
   * @param {{ ensureDirectory: (target: string) => Promise<void>, copyFile: (source: string, destination: string) => Promise<void> }} io - Filesystem adapters.
   * @param {{ info: (message: string) => void }} messageLogger - Logger to report progress.
   * @returns {Promise<void>} Resolves when all files are copied.
   */
  async function copyIndividualFiles(copies, io, messageLogger) {
    await Promise.all(
      copies.map(async ({ source, target }) => {
        await io.ensureDirectory(dirname(target));
        await io.copyFile(source, target);
        messageLogger.info(
          `Copied: ${formatPathForLog(source)} -> ${formatPathForLog(target)}`
        );
      })
    );
  }

  /**
   * Copy a set of filenames from source to target directories, ensuring the target exists.
   * @param {{
   *   files: string[],
   *   sourceDir: string,
   *   targetDir: string,
   *   io: CopyAsyncIo,
   *   messageLogger: CopyMessageLogger,
   * }} options Copy details.
   * @returns {Promise<void>} Resolves when every file is copied.
   */
  async function copyFiles({ files, sourceDir, targetDir, io, messageLogger }) {
    await io.ensureDirectory(targetDir);
    if (!files.length) {
      return;
    }

    await runInParallel(files, name =>
      copyFileToTarget({
        io,
        sourceDir,
        targetDir,
        name,
        messageLogger,
      })
    );
  }

  /**
   * Proxy copy calls through a shared helper to reduce duplication.
   * @param {{
   *   files: string[],
   *   sourceDir: string,
   *   targetDir: string,
   *   io: CopyAsyncIo,
   *   messageLogger: CopyMessageLogger,
   * }} details Prepared copy parameters.
   * @returns {Promise<void>}
   */
  async function performCopy(details) {
    await copyFiles(details);
  }

  /**
   * Copy every configured directory using the provided helper.
   * @param {{ source: string, target: string }[]} directories - Directory copy plans.
   * @param {{ ensureDirectory: (target: string) => Promise<void> }} io - Filesystem adapters.
   * @param {{ info: (message: string) => void }} messageLogger - Logger for progress events.
   * @returns {Promise<void>} Resolves once every directory copy finishes.
   */
  async function copyDirectories(directories, io, messageLogger) {
    for (const directory of directories) {
      await copyDirectory(directory, io, messageLogger);
    }
  }

  /**
   * Execute the copy workflow using the provided configuration.
   * @param {{
   *   directoryCopies: { source: string, target: string }[],
   *   fileCopies?: { sourceDir: string, targetDir: string, files: string[] },
   *   individualFileCopies?: { source: string, target: string }[],
   *   io: {
   *     ensureDirectory: (target: string) => Promise<void>,
   *     readDirEntries: (dir: string) => Promise<import('fs').Dirent[]>,
   *     copyFile: (source: string, destination: string) => Promise<void>,
   *   },
   *   messageLogger: { info: (message: string) => void },
   * }} options - Copy workflow options.
   * @returns {Promise<void>} Resolves when all copy steps finish.
   */
  async function runCopyToInfra(options) {
    const {
      directoryCopies,
      fileCopies,
      individualFileCopies = [],
      io,
      messageLogger,
    } = options;

    await copyDirectories(directoryCopies, io, messageLogger);
    await copyDeclaredFiles(fileCopies, io, messageLogger);
    await copyIndividualFiles(individualFileCopies, io, messageLogger);
  }

  return buildCopyExportMap([
    ['runCopyToInfra', runCopyToInfra],
    ['copyIndividualFiles', copyIndividualFiles],
    ['copyDeclaredFiles', copyDeclaredFiles],
    ['copyDirectory', copyDirectory],
    ['copyFileToTarget', copyFileToTarget],
    ['isCopyableFile', isCopyableFile],
    ['formatPathForLog', formatPathForLog],
  ]);
}
