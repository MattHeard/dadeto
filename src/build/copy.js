#!/usr/bin/env node

import {
  createCopyCore,
  createStaticSiteCopyDirectories,
} from '../core/build/blog.js';
import {
  createPathAdapters,
  getCurrentDirectory,
  resolveProjectDirectories,
} from './path.js';
import { createFsAdapters } from './fs.js';

// Determine base directories using Node-specific helpers
const __dirname = getCurrentDirectory(import.meta.url);
const { projectRoot, srcDir, publicDir } = resolveProjectDirectories(__dirname);

const pathAdapters = createPathAdapters();

const directories = createStaticSiteCopyDirectories({
  path: pathAdapters,
  projectRoot,
  srcDir,
  publicDir,
});

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
  io: thirdParty,
  messageLogger: logger,
});
