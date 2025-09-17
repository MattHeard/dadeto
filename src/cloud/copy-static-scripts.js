import { copyFile, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const files = ['admin.js', 'googleAuth.js', 'moderate.js'];
const sourceDir = join(process.cwd(), 'src/cloud');
const targetDir = join(process.cwd(), 'infra');

/**
 * Copy static admin and moderation scripts into the infra directory.
 * @returns {Promise<void>} Promise resolving when all files have been copied.
 */
async function copyStaticScripts() {
  await mkdir(targetDir, { recursive: true });

  await Promise.all(
    files.map(async file => {
      const sourcePath = join(sourceDir, file);
      const destinationPath = join(targetDir, file);
      await unlink(destinationPath).catch(error => {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      });
      await copyFile(sourcePath, destinationPath);
      console.log(`Copied: ${sourcePath} -> ${destinationPath}`);
    })
  );
}

await copyStaticScripts();
