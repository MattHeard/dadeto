#!/usr/bin/env node

import { createCopyCore } from '../core/build/blog.js';
import {
  createPathAdapters,
  getCurrentDirectory,
  resolveProjectDirectories,
} from './path.js';
import { createFsAdapters } from './fs.js';

// Determine base directories using Node-specific helpers
const __dirname = getCurrentDirectory(import.meta.url);
const { projectRoot, srcDir, publicDir } = resolveProjectDirectories(__dirname);

const { runCopyWorkflow } = createCopyCore({
  console,
  createFsAdapters,
  createPathAdapters,
  projectRoot,
  publicDir,
  srcDir,
});

runCopyWorkflow();
