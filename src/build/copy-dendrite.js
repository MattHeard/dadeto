#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCopyDendriteCore } from '../core/build/dendrite.js';

const { runCopyDendriteWorkflow } = createCopyDendriteCore({
  console,
  fs,
  path,
  fileURLToPath,
  importMetaUrl: import.meta.url,
});

runCopyDendriteWorkflow();
