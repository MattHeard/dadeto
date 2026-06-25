import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { createRunStrykerWorktreeHandle } from '../core/scripts/run-stryker-worktree-core.js';

const ROOT_DIR = path.resolve('.');
const mutateTargetDir = process.argv[2];
const handle = createRunStrykerWorktreeHandle({
  rootDir: ROOT_DIR,
  mutateTargetDir,
});

const isDirectExecution =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  await handle();
}

export { handle };
