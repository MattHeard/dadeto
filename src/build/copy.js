#!/usr/bin/env node

import {
  createConsoleMessageLogger,
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

const logger = createConsoleMessageLogger(console);

const { runCopyWorkflow } = createCopyCore({
  directories,
  io: thirdParty,
  messageLogger: logger,
  path: pathAdapters,
});

runCopyWorkflow();
