import { spawn } from 'node:child_process';
import { mkdtemp, rm, cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Create the Stryker worktree runner.
 * @param {{
 *   processModule?: { env: NodeJS.ProcessEnv },
 *   fsModule?: {
 *     mkdtemp: typeof mkdtemp,
 *     rm: typeof rm,
 *     cp: typeof cp,
 *     mkdir: typeof mkdir,
 *     writeFile: typeof writeFile,
 *   },
 *   pathModule?: typeof path,
 *   spawnImpl?: typeof spawn,
 *   rootDir?: string,
 * }} [options] Runner dependencies.
 * @returns {() => Promise<void>} Runner handle.
 */
export function createRunStrykerWorktreeHandle(options = {}) {
  const processModule = options.processModule || process;
  const fsModule = options.fsModule || { mkdtemp, rm, cp, mkdir, writeFile };
  const pathModule = options.pathModule || path;
  const spawnImpl = options.spawnImpl || spawn;
  const mainRoot = options.rootDir || pathModule.resolve('.');
  const worktreeParent = pathModule.join(mainRoot, '.worktrees');
  const worktreePrefix = pathModule.join(worktreeParent, 'stryker-');
  const worktreeStrykerConfig = 'stryker.worktree.config.mjs';

  return async () => {
    await fsModule.mkdir(worktreeParent, { recursive: true });

    const worktreePath = await fsModule.mkdtemp(worktreePrefix);
    const reportSource = pathModule.join(worktreePath, 'reports/mutation');
    const reportTarget = pathModule.join(mainRoot, 'reports/mutation');

    try {
      await runCommand(
        spawnImpl,
        'git',
        ['worktree', 'add', '--detach', worktreePath],
        mainRoot
      );
      await runCommand(spawnImpl, 'npm', ['install'], worktreePath);
      await fsModule.writeFile(
        pathModule.join(worktreePath, worktreeStrykerConfig),
        buildStrykerConfig()
      );
      await runCommand(
        spawnImpl,
        'node',
        [
          '--experimental-vm-modules',
          './node_modules/.bin/stryker',
          'run',
          worktreeStrykerConfig,
        ],
        worktreePath,
        {
          env: {
            ...processModule.env,
            STRYKER_TEST_ENV: '1',
          },
        }
      );
      await fsModule.rm(reportTarget, { recursive: true, force: true });
      await fsModule.cp(reportSource, reportTarget, { recursive: true });
      console.log(
        `Synced mutation reports to ${pathModule.relative(mainRoot, reportTarget)}`
      );
    } finally {
      await runCommand(
        spawnImpl,
        'git',
        ['worktree', 'remove', '--force', worktreePath],
        mainRoot,
        { allowFailure: true }
      ).catch(() => {});
      await fsModule
        .rm(worktreePath, { recursive: true, force: true })
        .catch(() => {});
    }
  };
}

/**
 *
 */
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

/**
 * @param {typeof spawn} spawnImpl Spawn implementation.
 * @param {string} command Command to run.
 * @param {string[]} args Command arguments.
 * @param {string} cwd Working directory.
 * @param {{ allowFailure?: boolean, env?: NodeJS.ProcessEnv }} [options] Command options.
 * @returns {Promise<void>} Resolves when the command exits successfully.
 */
async function runCommand(spawnImpl, command, args, cwd, options = {}) {
  const { allowFailure = false, env = process.env } = options;
  await new Promise(
    /**
     * @param {(value?: void | PromiseLike<void>) => void} resolve
     *  @param {(reason?: unknown) => void} reject
     */
    (resolve, reject) => {
      const child = spawnImpl(command, args, {
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
        reject(
          new Error(`${command} ${args.join(' ')} exited with code ${code}`)
        );
      });
    }
  );
}
