import { readdir, copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const sourceDir = join(process.cwd(), "src/cloud/assign-moderation-job");
const targetDir = join(
  process.cwd(),
  "infra/cloud-functions/assign-moderation-job"
);

async function copyAssignModerationJob() {
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const files = entries.filter(
    (entry) => entry.isFile() && entry.name.endsWith(".js")
  );

  await Promise.all(
    files.map(async (file) => {
      const sourcePath = join(sourceDir, file.name);
      const destinationPath = join(targetDir, file.name);
      await copyFile(sourcePath, destinationPath);
    })
  );
}

await copyAssignModerationJob();
