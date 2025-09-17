import { readdir, copyFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";

const sourceDir = join(process.cwd(), "src/cloud/generate-stats");
const targetDir = join(process.cwd(), "infra/cloud-functions/generate-stats");

/**
 * Copy the generate-stats Cloud Function sources into the infra directory.
 * @returns {Promise<void>} Promise resolving when the files are copied.
 */
async function copyGenerateStats() {
  await mkdir(targetDir, { recursive: true });
  const [sourceEntries, targetEntries] = await Promise.all([
    readdir(sourceDir, { withFileTypes: true }),
    readdir(targetDir, { withFileTypes: true }),
  ]);

  const files = sourceEntries.filter(
    (entry) => entry.isFile() && entry.name.endsWith(".js")
  );

  const existingTargets = targetEntries.filter(
    (entry) => entry.isFile() && entry.name.endsWith(".js")
  );

  await Promise.all(
    existingTargets.map((file) => unlink(join(targetDir, file.name)))
  );

  await Promise.all(
    files.map(async (file) => {
      const sourcePath = join(sourceDir, file.name);
      const destinationPath = join(targetDir, file.name);
      await copyFile(sourcePath, destinationPath);
      console.log(`Copied: ${sourcePath} -> ${destinationPath}`);
    })
  );
}

await copyGenerateStats();
