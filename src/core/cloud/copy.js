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
    const relativePath = relative(projectRoot, targetPath);
    if (!relativePath) {
      return '.';
    }
    if (relativePath.startsWith('..')) {
      return targetPath;
    }
    return relativePath;
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
    await io.ensureDirectory(target);

    const sourceEntries = await io.readDirEntries(source);
    const sourceFiles = sourceEntries.filter(isCopyableFile);
    await Promise.all(
      sourceFiles.map(entry =>
        copyFileToTarget({
          io,
          sourceDir: source,
          targetDir: target,
          name: entry.name,
          messageLogger,
        })
      )
    );
  }

  /**
   * Copy a declared list of files into the target directory.
   * @param {{ sourceDir: string, targetDir: string, files: string[] }} copyPlan - Copy configuration.
   * @param {{ ensureDirectory: (target: string) => Promise<void>, copyFile: (source: string, destination: string) => Promise<void> }} io - Filesystem adapters.
   * @param {{ info: (message: string) => void }} messageLogger - Logger to report progress.
   * @returns {Promise<void>} Resolves when all files are copied.
   */
  async function copyDeclaredFiles(copyPlan, io, messageLogger) {
    const { sourceDir, targetDir, files } = copyPlan;
    await io.ensureDirectory(targetDir);

    await Promise.all(
      files.map(file =>
        copyFileToTarget({
          io,
          sourceDir,
          targetDir,
          name: file,
          messageLogger,
        })
      )
    );
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
  async function runCopyToInfra({
    directoryCopies,
    fileCopies,
    individualFileCopies,
    io,
    messageLogger,
  }) {
    for (const directory of directoryCopies) {
      await copyDirectory(directory, io, messageLogger);
    }

    if (fileCopies) {
      await copyDeclaredFiles(fileCopies, io, messageLogger);
    }

    if (individualFileCopies?.length) {
      await copyIndividualFiles(individualFileCopies, io, messageLogger);
    }
  }

  return {
    formatPathForLog,
    isCopyableFile,
    copyFileToTarget,
    copyDirectory,
    copyDeclaredFiles,
    copyIndividualFiles,
    runCopyToInfra,
  };
}
