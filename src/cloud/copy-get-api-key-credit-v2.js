import { readdir, copyFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";

const sourceDir = join(process.cwd(), "src/cloud/get-api-key-credit-v2");
const targetDir = join(
  process.cwd(),
  "infra/cloud-functions/get-api-key-credit-v2"
);

/**
 * Copy the get-api-key-credit-v2 Cloud Function sources into the infra directory.
 * @returns {Promise<void>} Promise resolving when the files are copied.
 */
async function copyGetApiKeyCreditV2() {
  await mkdir(targetDir, { recursive: true });
  const [sourceEntries, targetEntries] = await Promise.all([
    readdir(sourceDir, { withFileTypes: true }),
    readdir(targetDir, { withFileTypes: true }).catch(error => {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }),
  ]);

  const files = sourceEntries.filter(
    entry => entry.isFile() && entry.name.endsWith(".js")
  );

  const existingTargets = targetEntries.filter(
    entry => entry.isFile() && entry.name.endsWith(".js")
  );

  await Promise.all(
    existingTargets.map(file => unlink(join(targetDir, file.name)))
  );

  await Promise.all(
    files.map(async file => {
      const sourcePath = join(sourceDir, file.name);
      const destinationPath = join(targetDir, file.name);
      await copyFile(sourcePath, destinationPath);
      console.log(`Copied: ${sourcePath} -> ${destinationPath}`);
    })
  );
}

await copyGetApiKeyCreditV2();
