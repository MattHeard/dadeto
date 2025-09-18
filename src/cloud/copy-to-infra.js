import { readdir, copyFile, mkdir, unlink } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';

const COPYABLE_EXTENSIONS = new Set(['.js', '.json']);

const functionDirectories = [
  'assign-moderation-job',
  'generate-stats',
  'get-api-key-credit',
  'get-api-key-credit-v2',
  'get-moderation-variant',
  'hide-variant-html',
  'mark-variant-dirty',
  'process-new-page',
  'process-new-story',
  'prod-update-variant-visibility',
  'render-contents',
  'render-variant',
  'report-for-moderation',
  'submit-moderation-rating',
  'submit-new-page',
  'submit-new-story',
];

const directoryCopies = functionDirectories.map(name => ({
  source: join(process.cwd(), 'src/cloud', name),
  target: join(process.cwd(), 'infra/cloud-functions', name),
}));

const fileCopies = {
  sourceDir: join(process.cwd(), 'src/cloud'),
  targetDir: join(process.cwd(), 'infra'),
  files: ['googleAuth.js', 'moderate.js'],
};

const individualFileCopies = [
  {
    source: join(process.cwd(), 'src/browser', 'admin.js'),
    target: join(process.cwd(), 'infra', 'admin.js'),
  },
];

/**
 * Read directory entries, returning an empty array when the directory is missing.
 * @param {string} directory - Absolute path of the directory to read.
 * @returns {Promise<import("node:fs").Dirent[]>} Array of directory entries.
 */
async function readEntries(directory) {
  return readdir(directory, { withFileTypes: true }).catch(
    handleMissingDirectory
  );
}

/**
 * Translate a missing directory error into an empty entry list.
 * @param {Error & { code?: string }} error - Error thrown while reading the directory.
 * @returns {import('node:fs').Dirent[]} Empty array when the directory is missing.
 */
function handleMissingDirectory(error) {
  if (error.code === 'ENOENT') {
    return [];
  }
  throw error;
}

/**
 * Determine whether the provided entry references a copyable file type.
 * @param {import("node:fs").Dirent} entry - Directory entry to inspect.
 * @returns {boolean} True when the entry points to a supported file type.
 */
function isCopyableFile(entry) {
  return entry.isFile() && COPYABLE_EXTENSIONS.has(extname(entry.name));
}

/**
 * Remove a file when it exists.
 * @param {string} path - Absolute file path to delete if present.
 * @returns {Promise<void>} Promise resolving when the file is removed or absent.
 */
async function deleteIfPresent(path) {
  await unlink(path).catch(ignoreMissingFile);
}

/**
 * Ignore missing file errors while rethrowing unexpected failures.
 * @param {Error & { code?: string }} error - Error thrown by unlink.
 */
function ignoreMissingFile(error) {
  if (error.code === 'ENOENT') {
    return;
  }
  throw error;
}

/**
 * Remove a collection of directory entries.
 * @param {string} directory - Directory containing the entries.
 * @param {import("node:fs").Dirent[]} entries - Entries slated for deletion.
 * @returns {Promise<void>} Promise resolving when all entries have been removed.
 */
async function removeEntries(directory, entries) {
  await Promise.all(
    entries.map(entry => deleteIfPresent(join(directory, entry.name)))
  );
}

/**
 * Copy a single file from source to target.
 * @param {string} sourceDir - Directory containing the file.
 * @param {string} targetDir - Destination directory for the file.
 * @param {string} name - File name to copy.
 * @returns {Promise<void>} Promise resolving once the file is copied.
 */
async function copyFileToTarget(sourceDir, targetDir, name) {
  const sourcePath = join(sourceDir, name);
  const destinationPath = join(targetDir, name);
  await copyFile(sourcePath, destinationPath);
  console.log(`Copied: ${sourcePath} -> ${destinationPath}`);
}

/**
 * Copy a directory of JavaScript files into the infra tree.
 * @param {{source: string, target: string}} copyPlan - Source and target paths.
 * @returns {Promise<void>} Promise resolving when the directory has been copied.
 */
async function copyDirectory(copyPlan) {
  const { source, target } = copyPlan;
  await mkdir(target, { recursive: true });

  const [sourceEntries, targetEntries] = await Promise.all([
    readEntries(source),
    readEntries(target),
  ]);

  const sourceFiles = sourceEntries.filter(isCopyableFile);
  const targetFiles = targetEntries.filter(isCopyableFile);

  await removeEntries(target, targetFiles);
  await Promise.all(
    sourceFiles.map(entry => copyFileToTarget(source, target, entry.name))
  );
}

/**
 * Copy an explicit list of files into the infra directory.
 * @param {{sourceDir: string, targetDir: string, files: string[]}} copyPlan - File copy definition.
 * @returns {Promise<void>} Promise resolving when the files are copied.
 */
async function copyDeclaredFiles(copyPlan) {
  const { sourceDir, targetDir, files } = copyPlan;
  await mkdir(targetDir, { recursive: true });

  await Promise.all(
    files.map(async file => {
      const destinationPath = join(targetDir, file);
      await deleteIfPresent(destinationPath);
      await copyFileToTarget(sourceDir, targetDir, file);
    })
  );
}

/**
 * Copy files defined by explicit source and target paths.
 * @param {{source: string, target: string}[]} copies - Absolute file copy plans.
 * @returns {Promise<void>} Promise resolving when all files have been copied.
 */
async function copyIndividualFiles(copies) {
  await Promise.all(
    copies.map(async ({ source, target }) => {
      await mkdir(dirname(target), { recursive: true });
      await deleteIfPresent(target);
      await copyFile(source, target);
      console.log(`Copied: ${source} -> ${target}`);
    })
  );
}

/**
 * Copy all Cloud Function assets into the infra directory.
 * @returns {Promise<void>} Promise resolving when all assets are copied.
 */
async function copyToInfra() {
  for (const directory of directoryCopies) {
    await copyDirectory(directory);
  }

  await copyDeclaredFiles(fileCopies);
  await copyIndividualFiles(individualFileCopies);
}

await copyToInfra();
