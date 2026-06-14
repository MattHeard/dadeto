import { spawn } from 'node:child_process';
import {
  mkdtemp,
  rm,
  cp,
  mkdir,
  writeFile,
  appendFile,
} from 'node:fs/promises';
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
 *     appendFile: typeof appendFile,
 *   },
 *   pathModule?: typeof path,
 *   spawnImpl?: typeof spawn,
 *   rootDir?: string,
 * }} [options] Runner dependencies.
 * @returns {() => Promise<void>} Runner handle.
 */
export function createRunStrykerWorktreeHandle(options = {}) {
  const processModule = options.processModule || process;
  const fsModule = options.fsModule || {
    mkdtemp,
    rm,
    cp,
    mkdir,
    writeFile,
    appendFile,
  };
  const pathModule = options.pathModule || path;
  const spawnImpl = options.spawnImpl || spawn;
  const mainRoot = options.rootDir || pathModule.resolve('.');
  const worktreeParent = pathModule.join(mainRoot, '.worktrees');
  const worktreePrefix = pathModule.join(worktreeParent, 'stryker-');
  const worktreeStrykerConfig = 'stryker.worktree.config.mjs';
  const noDaemonEnv = {
    BEADS_NO_DAEMON: '1',
  };

  return async () => {
    await fsModule.mkdir(worktreeParent, { recursive: true });

    const worktreePath = await fsModule.mkdtemp(worktreePrefix);
    const reportSource = pathModule.join(worktreePath, 'reports/mutation');
    const reportTarget = pathModule.join(mainRoot, 'reports/mutation');
    const machineLogPath = pathModule.join(reportTarget, 'worktree-run.jsonl');

    await fsModule.mkdir(reportTarget, { recursive: true });
    await writeMachineLog(fsModule, machineLogPath, {
      type: 'start',
      mainRoot,
      worktreePath,
      reportTarget,
    });

    try {
      for (const step of [
        {
          command: 'git',
          args: ['worktree', 'add', '--detach', worktreePath],
          cwd: mainRoot,
        },
        {
          command: 'npm',
          args: ['install'],
          cwd: worktreePath,
        },
      ]) {
        await runLoggedCommandStep(
          fsModule,
          machineLogPath,
          spawnImpl,
          processModule.env,
          noDaemonEnv,
          step.command,
          step.args,
          step.cwd
        );
      }
      await fsModule.writeFile(
        pathModule.join(worktreePath, worktreeStrykerConfig),
        buildStrykerConfig()
      );
      await writeMachineLog(fsModule, machineLogPath, {
        type: 'config-written',
        filePath: pathModule.join(worktreePath, worktreeStrykerConfig),
      });
      await runLoggedCommandStep(
        fsModule,
        machineLogPath,
        spawnImpl,
        processModule.env,
        {
          STRYKER_TEST_ENV: '1',
          ...noDaemonEnv,
        },
        'node',
        [
          '--experimental-vm-modules',
          './node_modules/.bin/stryker',
          'run',
          worktreeStrykerConfig,
        ],
        worktreePath
      );
      await writeMachineLog(fsModule, machineLogPath, {
        type: 'reports-sync-start',
        from: reportSource,
        to: reportTarget,
      });
      await fsModule.cp(reportSource, reportTarget, { recursive: true });
      await writeMachineLog(fsModule, machineLogPath, {
        type: 'reports-sync-success',
        from: reportSource,
        to: reportTarget,
      });
      console.log(
        `Synced mutation reports to ${pathModule.relative(mainRoot, reportTarget)}`
      );
    } finally {
      await writeMachineLog(fsModule, machineLogPath, {
        type: 'cleanup-start',
        worktreePath,
      });
      await runCommand(
        spawnImpl,
        'git',
        ['worktree', 'remove', '--force', worktreePath],
        mainRoot,
        {
          allowFailure: true,
          env: buildChildEnv(processModule.env, noDaemonEnv),
        }
      ).catch(() => {});
      await fsModule
        .rm(worktreePath, { recursive: true, force: true })
        .catch(() => {});
      await writeMachineLog(fsModule, machineLogPath, {
        type: 'cleanup-complete',
        worktreePath,
      });
    }
  };
}

export {
  handleRunCommandError,
  handleRunCommandExit,
  resolveIfAllowed,
  runCommand,
  buildChildEnv,
  buildStrykerConfig,
};

/**
 * Merge child-process environment variables.
 * @param {NodeJS.ProcessEnv} baseEnv Base environment.
 * @param {NodeJS.ProcessEnv} overrides Override environment.
 * @returns {NodeJS.ProcessEnv} Combined environment.
 */
function buildChildEnv(baseEnv, overrides) {
  return {
    ...baseEnv,
    ...overrides,
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
 * Write the log entries and run a command with the shared env setup.
 * @param {{
 *   mkdir: typeof mkdir,
 *   appendFile: typeof appendFile,
 * }} fsModule Filesystem dependencies.
 * @param {string} machineLogPath Log destination.
 * @param {typeof spawn} spawnImpl Spawn implementation.
 * @param {NodeJS.ProcessEnv} baseEnv Parent environment.
 * @param {NodeJS.ProcessEnv} extraEnv Extra environment entries.
 * @param {string} command Command to run.
 * @param {string[]} args Command arguments.
 * @param {string} cwd Working directory.
 * @returns {Promise<void>} Nothing.
 */
async function runLoggedCommandStep(
  fsModule,
  machineLogPath,
  spawnImpl,
  baseEnv,
  extraEnv,
  command,
  args,
  cwd
) {
  await writeMachineLog(fsModule, machineLogPath, {
    type: 'command-start',
    command,
    args,
    cwd,
  });
  await runCommand(spawnImpl, command, args, cwd, {
    env: buildChildEnv(baseEnv, extraEnv),
  });
  await writeMachineLog(fsModule, machineLogPath, {
    type: 'command-success',
    command,
    args,
    cwd,
  });
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
      child.once('error', error =>
        handleRunCommandError(error, allowFailure, resolve, reject)
      );
      child.once('exit', code =>
        handleRunCommandExit(command, args, code, allowFailure, resolve, reject)
      );
    }
  );
}

/**
 * Append a machine-readable log entry that persists after teardown.
 * @param {{
 *   appendFile: typeof appendFile,
 *   mkdir: typeof mkdir,
 * }} fsModule Filesystem dependencies.
 * @param {string} logPath Destination log path.
 * @param {Record<string, unknown>} entry Log payload.
 * @returns {Promise<void>} Resolves once the entry is written.
 */
async function writeMachineLog(fsModule, logPath, entry) {
  await fsModule.mkdir(path.dirname(logPath), { recursive: true });
  await fsModule.appendFile(
    logPath,
    `${JSON.stringify({ timestamp: new Date().toISOString(), ...entry })}\n`
  );
}

/**
 * Handle a spawned command error.
 * @param {unknown} error Spawn error.
 * @param {boolean} allowFailure Whether failures should be ignored.
 * @param {(value?: void | PromiseLike<void>) => void} resolve Promise resolver.
 * @param {(reason?: unknown) => void} reject Promise rejecter.
 * @returns {void}
 */
function handleRunCommandError(error, allowFailure, resolve, reject) {
  if (resolveIfAllowed(allowFailure, resolve)) {
    return;
  }

  reject(error);
}

/**
 * Handle a spawned command exit code.
 * @param {string} command Command name.
 * @param {string[]} args Command arguments.
 * @param {number | null} code Exit code.
 * @param {boolean} allowFailure Whether failures should be ignored.
 * @param {(value?: void | PromiseLike<void>) => void} resolve Promise resolver.
 * @param {(reason?: unknown) => void} reject Promise rejecter.
 * @returns {void}
 */
function handleRunCommandExit(
  command,
  args,
  code,
  allowFailure,
  resolve,
  reject
) {
  if (code === 0) {
    resolve();
    return;
  }

  if (handleAllowedFailure(allowFailure, resolve)) {
    return;
  }

  reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
}

/**
 * Resolve the command promise when failures are allowed.
 * @param {boolean} allowFailure Whether failures should be ignored.
 * @param {(value?: void | PromiseLike<void>) => void} resolve Promise resolver.
 * @returns {boolean} True when the promise was resolved.
 */
function resolveIfAllowed(allowFailure, resolve) {
  if (!allowFailure) {
    return false;
  }

  resolve();
  return true;
}

/**
 * Resolve a command failure when ignored failures are enabled.
 * @param {boolean} allowFailure Whether failures should be ignored.
 * @param {(value?: void | PromiseLike<void>) => void} resolve Promise resolver.
 * @returns {boolean} True when the promise was resolved.
 */
function handleAllowedFailure(allowFailure, resolve) {
  return resolveIfAllowed(allowFailure, resolve);
}
