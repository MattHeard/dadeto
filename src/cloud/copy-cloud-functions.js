import { readdir, copyFile, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const sourceRoot = join(process.cwd(), 'src/cloud');
const targetRoot = join(process.cwd(), 'infra/cloud-functions');

/**
 * Copy JavaScript sources for a single Cloud Function directory.
 * @param {string} dirName Directory name under src/cloud.
 * @returns {Promise<void>} Resolves when files are copied.
 */
async function copyCloudFunction(dirName) {
  const sourceDir = join(sourceRoot, dirName);
  const targetDir = join(targetRoot, dirName);
  await mkdir(targetDir, { recursive: true });

  const [sourceEntries, targetEntries] = await Promise.all([
    readdir(sourceDir, { withFileTypes: true }),
    readdir(targetDir, { withFileTypes: true }),
  ]);

  const sourceFiles = sourceEntries.filter(
    entry => entry.isFile() && entry.name.endsWith('.js')
  );
  const targetFiles = targetEntries.filter(
    entry => entry.isFile() && entry.name.endsWith('.js')
  );

  await Promise.all(
    targetFiles.map(file => unlink(join(targetDir, file.name)))
  );

  await Promise.all(
    sourceFiles.map(async file => {
      const sourcePath = join(sourceDir, file.name);
      const destinationPath = join(targetDir, file.name);
      await copyFile(sourcePath, destinationPath);
    })
  );
}

/**
 * Copy every Cloud Function directory from src into infra.
 * @returns {Promise<void>} Resolves when all directories are synchronized.
 */
async function copyCloudFunctions() {
  const entries = await readdir(sourceRoot, { withFileTypes: true });
  const directories = entries.filter(entry => entry.isDirectory());

  await Promise.all(directories.map(dir => copyCloudFunction(dir.name)));
}

await copyCloudFunctions();
