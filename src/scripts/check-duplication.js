import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync as defaultSpawnSync } from 'node:child_process';
import { createCheckDuplicationHandle } from '../core/scripts/check-duplication.js';

const ROOT_DIR = path.resolve('.');
const handle = createCheckDuplicationHandle({
  spawnImpl: defaultSpawnSync,
  readFileSync: fs.readFileSync,
  stdout: process.stdout,
  stderr: process.stderr,
  rootDir: ROOT_DIR,
});

const isDirectExecution =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  const result = handle();
  process.exitCode = result.exitCode;
}

export { handle };
