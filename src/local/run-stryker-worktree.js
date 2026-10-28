import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import { createWorktreeSpawn } from '../adapters/worktree.js';
import { bindEffectBoundary } from './allow-effects.js';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { createRunStrykerWorktreeHandle } from '../core/scripts/run-stryker-worktree-core.js';

const ROOT_DIR = path.resolve('.');
const mutateTargetDir = process.argv[2];
const handle = createRunStrykerWorktreeHandle({
  pathModule: path,
  processModule: process,
  fsModule: {
    mkdtemp: (_permission, prefix) => fs.mkdtemp(prefix),
    mkdir: (_permission, target, options) => fs.mkdir(target, options),
    rm: (_permission, target, options) => fs.rm(target, options),
    cp: (_permission, from, to, options) => fs.cp(from, to, options),
    writeFile: (_permission, target, content) => fs.writeFile(target, content),
    appendFile: (_permission, target, content) =>
      fs.appendFile(target, content),
  },
  spawnImpl: createWorktreeSpawn(spawn),
  now: _permission => new Date().toISOString(),
  bindEffectBoundary,
  rootDir: ROOT_DIR,
  mutateTargetDir,
  log: (_permission, message) => console.log(message),
});

const isDirectExecution =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  await handle();
}

export { handle };
