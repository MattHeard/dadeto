import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createCheckDepcruiseHandle } from '../core/scripts/check-depcruise.js';

const handle = createCheckDepcruiseHandle({
  spawnImpl: spawnSync,
  readFileSync: fs.readFileSync,
  readdirSync: fs.readdirSync,
  stdout: process.stdout,
  stderr: process.stderr,
  rootDir: process.cwd(),
});

const result = handle();
process.exitCode = result.exitCode;
