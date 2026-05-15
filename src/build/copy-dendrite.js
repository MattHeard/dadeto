#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../");
const copyTree = (source, destination) => {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);
    entry.isDirectory() ? copyTree(srcPath, destPath) : fs.copyFileSync(srcPath, destPath);
  }
};

console.log("Copying files for dendritestories.co.nz deployment...");
copyTree(path.join(root, "src", "browser"), path.join(root, "infra", "browser"));
copyTree(path.join(root, "src", "core"), path.join(root, "infra", "core"));
console.log("✓ Copied browser files to infra/browser");
console.log("✓ Copied core files to infra/core");
console.log("Ready for Terraform deployment to GCS");
