#!/usr/bin/env node

/**
 * Copy browser and core files to infra/ directory for dendritestories.co.nz
 * These files are served from Google Cloud Storage and managed by Terraform.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../');
const srcDir = path.join(projectRoot, 'src');
const infraDir = path.join(projectRoot, 'infra');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`Source directory not found: ${src}`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src, { withFileTypes: true });

  files.forEach(file => {
    const srcPath = path.join(src, file.name);
    const destPath = path.join(dest, file.name);

    if (file.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

console.log('Copying files for dendritestories.co.nz deployment...');

// Copy browser and core directories to infra/
const srcBrowser = path.join(srcDir, 'browser');
const srcCore = path.join(srcDir, 'core');
const infraBrowser = path.join(infraDir, 'browser');
const infraCore = path.join(infraDir, 'core');

copyDir(srcBrowser, infraBrowser);
copyDir(srcCore, infraCore);

console.log('✓ Copied browser files to infra/browser');
console.log('✓ Copied core files to infra/core');
console.log('Ready for Terraform deployment to GCS');
