import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createCheckOverexposedExportsHandle } from '../core/scripts/check-overexposed-exports.js';

const handle = createCheckOverexposedExportsHandle({
  readFileSync: fs.readFileSync,
  readdirSync: fs.readdirSync,
  stdout: process.stdout,
  stderr: process.stderr,
  rootDir: process.cwd(),
  sourceRoot: 'src',
  pathModule: path,
});

const result = handle();
process.exitCode = result.exitCode;
