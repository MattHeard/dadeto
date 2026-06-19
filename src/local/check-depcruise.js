import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createCheckDepcruiseHandle } from '../core/scripts/check-depcruise.js';
import { createCheckDepcruiseScopeDeps } from '../local/check-depcruise-scope.js';

const handle = createCheckDepcruiseHandle({
  spawnImpl: spawnSync,
  readFileSync: fs.readFileSync,
  readdirSync: fs.readdirSync,
  stdout: process.stdout,
  stderr: process.stderr,
  rootDir: process.cwd(),
  pathModule: path,
  scopeAnalysisDeps: createCheckDepcruiseScopeDeps(),
});

const result = handle();
process.exitCode = result.exitCode;
