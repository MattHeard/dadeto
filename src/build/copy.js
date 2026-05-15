#!/usr/bin/env node

import { runCore } from "../core/build/runCore.js";
import {
  createPathAdapters,
  getCurrentDirectory,
  resolveProjectDirectories,
} from "./path.js";
import { createFsAdapters } from "./fs.js";

const __dirname = getCurrentDirectory(import.meta.url);
const { projectRoot, srcDir, publicDir } = resolveProjectDirectories(__dirname);

const environmentDependencies = {
  console,
  createFsAdapters,
  createPathAdapters,
  projectRoot,
  publicDir,
  srcDir,
};

runCore(environmentDependencies);
