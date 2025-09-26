#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCopyCore } from '../core/copy.js';

// Get __dirname equivalent in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define base directories
const projectRoot = path.resolve(__dirname, '../..'); // Adjust based on script location
const srcDir = path.resolve(projectRoot, 'src');
const publicDir = path.resolve(projectRoot, 'public');
const srcToysDir = path.resolve(srcDir, 'toys');
const srcBrowserDir = path.resolve(srcDir, 'browser');
const publicBrowserDir = path.join(publicDir, 'browser');
const srcUtilsDir = path.resolve(srcDir, 'utils');
const publicUtilsDir = path.join(publicDir, 'utils');

// New directory with handlers used by interactive components
const srcInputHandlersDir = path.resolve(srcDir, 'inputHandlers');
const publicInputHandlersDir = path.join(publicDir, 'inputHandlers');
const srcConstantsDir = path.resolve(srcDir, 'constants');
const publicConstantsDir = path.join(publicDir, 'constants');
const srcAssetsDir = path.resolve(srcDir, 'assets');
const publicAssetsDir = publicDir;
const srcPresentersDir = path.resolve(srcDir, 'presenters');
const publicPresentersDir = path.join(publicDir, 'presenters');
const srcBlogJson = path.join(srcDir, 'blog.json');
const publicBlogJson = path.join(publicDir, 'blog.json');

const directories = {
  projectRoot,
  srcDir,
  publicDir,
  srcToysDir,
  srcBrowserDir,
  publicBrowserDir,
  srcUtilsDir,
  publicUtilsDir,
  srcInputHandlersDir,
  publicInputHandlersDir,
  srcConstantsDir,
  publicConstantsDir,
  srcAssetsDir,
  publicAssetsDir,
  srcPresentersDir,
  publicPresentersDir,
  srcBlogJson,
  publicBlogJson,
};

const pathAdapters = {
  join: path.join,
  dirname: path.dirname,
  relative: path.relative,
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
