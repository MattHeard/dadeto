import { spawn } from 'node:child_process';
import { mkdtemp, rm, cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const MAIN_ROOT = path.resolve('.');
const WORKTREE_PARENT = path.join(MAIN_ROOT, '.worktrees');
const WORKTREE_PREFIX = path.join(WORKTREE_PARENT, 'stryker-');
const WORKTREE_STRYKER_CONFIG = 'stryker.worktree.config.mjs';

await mkdir(WORKTREE_PARENT, { recursive: true });

const worktreePath = await mkdtemp(WORKTREE_PREFIX);
const REPORT_SOURCE = path.join(worktreePath, 'reports/mutation');
const REPORT_TARGET = path.join(MAIN_ROOT, 'reports/mutation');

try {
  await runCommand('git', ['worktree', 'add', '--detach', worktreePath], MAIN_ROOT);

  await runCommand('npm', ['install'], worktreePath);
  await writeFile(path.join(worktreePath, WORKTREE_STRYKER_CONFIG), buildStrykerConfig());

  await runCommand(
    'node',
    ['--experimental-vm-modules', './node_modules/.bin/stryker', 'run', WORKTREE_STRYKER_CONFIG],
    worktreePath,
    {
      ...process.env,
      STRYKER_TEST_ENV: '1',
    }
  );

  await rm(REPORT_TARGET, { recursive: true, force: true });
  await cp(REPORT_SOURCE, REPORT_TARGET, { recursive: true });

  console.log(`Synced mutation reports to ${path.relative(MAIN_ROOT, REPORT_TARGET)}`);
} finally {
  await runCommand('git', ['worktree', 'remove', '--force', worktreePath], MAIN_ROOT, {
    allowFailure: true,
  }).catch(() => {});
  await rm(worktreePath, { recursive: true, force: true }).catch(() => {});
}

function buildStrykerConfig() {
  return `import baseConfig from './stryker.config.mjs';

export default {
  ...baseConfig,
  concurrency: 1,
  testRunnerNodeArgs: [
    '--experimental-vm-modules',
    '--max-old-space-size=2048',
  ],
};
`;
}

async function runCommand(command, args, cwd, options = {}) {
  const { allowFailure = false, env = process.env } = options;
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: 'inherit',
    });
    child.once('error', error => {
      if (allowFailure) {
        resolve();
        return;
      }
      reject(error);
    });
    child.once('exit', code => {
      if (code === 0 || allowFailure) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}
