#!/usr/bin/env node

import { createCopyCore, createSharedDirectoryEntries } from '../core/build/blog.js';
import {
  createCopyDirectories,
  createPathAdapters,
  getCurrentDirectory,
  resolveProjectDirectories,
} from './path.js';
import { createFsAdapters } from './fs.js';

// Determine base directories using Node-specific helpers
const __dirname = getCurrentDirectory(import.meta.url);
const { projectRoot, srcDir, publicDir } = resolveProjectDirectories(__dirname);

const pathAdapters = createPathAdapters();

const sharedDirectoryEntries = createSharedDirectoryEntries({
  path: { join: pathAdapters.join },
  srcDir,
  publicDir,
});

const directories = createCopyDirectories(
  { projectRoot, srcDir, publicDir },
  sharedDirectoryEntries
);

const thirdParty = createFsAdapters();

const logger = {
  info: message => console.log(message),
  warn: message => console.warn(message),
};

const { runCopyWorkflow } = createCopyCore({
  directories,
  path: pathAdapters,
});

runCopyWorkflow({
  directories,
  io: thirdParty,
  messageLogger: logger,
});
