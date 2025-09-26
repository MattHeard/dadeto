#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createCopyCore,
  createSharedDirectoryEntries,
} from '../core/copy.js';

// Get __dirname equivalent in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define base directories
const projectRoot = path.resolve(__dirname, '../..'); // Adjust based on script location
const srcDir = path.resolve(projectRoot, 'src');
const publicDir = path.resolve(projectRoot, 'public');

const pathAdapters = {
  join: path.join,
  dirname: path.dirname,
  relative: path.relative,
};

const sharedDirectoryEntries = createSharedDirectoryEntries({
  path: { join: pathAdapters.join },
  srcDir,
  publicDir,
});

const directories = {
  projectRoot,
  srcDir,
  publicDir,
  ...Object.fromEntries(sharedDirectoryEntries),
  srcAssetsDir: path.resolve(srcDir, 'assets'),
  publicAssetsDir: publicDir,
  srcBlogJson: path.join(srcDir, 'blog.json'),
  publicBlogJson: path.join(publicDir, 'blog.json'),
};

const thirdParty = {
  directoryExists: target => fs.existsSync(target),
  createDirectory: target => fs.mkdirSync(target, { recursive: true }),
  copyFile: (source, destination) => fs.copyFileSync(source, destination),
  readDirEntries: dir => fs.readdirSync(dir, { withFileTypes: true }),
};

const logger = {
  info: message => console.log(message),
  warn: message => console.warn(message),
};

const {
  ensureDirectoryExists,
  copyBlogJson,
  copyToyFiles,
  copyPresenterFiles,
  copySupportingDirectories,
} = createCopyCore({ directories, path: pathAdapters });

/**
 * Execute the copy workflow.
 * @param {typeof thirdParty} io - File system helpers.
 * @param {typeof logger} messageLogger - Logger for status updates.
 * @returns {void}
 */
function main(io, messageLogger) {
  ensureDirectoryExists(io, directories.publicDir);
  copyBlogJson(directories, io, messageLogger);
  copyToyFiles(directories, io, messageLogger);
  copyPresenterFiles(directories, io, messageLogger);
  copySupportingDirectories(directories, io, messageLogger);
}

main(thirdParty, logger);
