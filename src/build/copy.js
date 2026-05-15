#!/usr/bin/env node

import { createCopyCore } from "../core/build/blog.js";
import {
  createPathAdapters,
  getCurrentDirectory,
  resolveProjectDirectories,
} from "./path.js";
import { createFsAdapters } from "./fs.js";

function loadEnvironmentDependencies() {
  const __dirname = getCurrentDirectory(import.meta.url);
  const { projectRoot, srcDir, publicDir } = resolveProjectDirectories(__dirname);

  return {
    console,
    createFsAdapters,
    createPathAdapters,
    projectRoot,
    publicDir,
    srcDir,
  };
}

function executeWorkflow(environmentDependencies) {
  createCopyCore(environmentDependencies).runCopyWorkflow();
}

executeWorkflow(loadEnvironmentDependencies());
