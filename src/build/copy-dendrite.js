#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { executeCopyDendriteWorkflow } from "../core/build/dendrite.js";

const environmentDependencies = {
  console,
  fs,
  path,
  fileURLToPath,
  importMetaUrl: import.meta.url,
};

executeCopyDendriteWorkflow(environmentDependencies);
