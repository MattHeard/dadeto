/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/**
 * @typedef {{
 *   (permission: AllowEffects, event: 'error', listener: (error: Error) => void): unknown,
 *   (permission: AllowEffects, event: 'exit', listener: (code: number | null) => void): unknown,
 * }} WorktreeListener
 */
/** @typedef {(permission: AllowEffects, command: string, args: string[], options: {cwd: string, env: Env, stdio: 'inherit'}) => {once: WorktreeListener}} WorktreeSpawn */
/**
 * @typedef {{
 *   mkdtemp: (permission: AllowEffects, prefix: string) => Promise<string>,
 *   rm: (permission: AllowEffects, path: string, options: {recursive: boolean, force: boolean}) => Promise<void>,
 *   cp: (permission: AllowEffects, from: string, to: string, options: {recursive: boolean}) => Promise<void>,
 *   mkdir: (permission: AllowEffects, path: string, options: {recursive: boolean}) => Promise<unknown>,
 *   writeFile: (permission: AllowEffects, path: string, content: string) => Promise<void>,
 *   appendFile: (permission: AllowEffects, path: string, content: string) => Promise<void>,
 * }} WorktreeFilesystem
 */
/**
 * @typedef {{
 *   join: (...parts: string[]) => string,
 *   dirname: (path: string) => string,
 *   resolve: (...parts: string[]) => string,
 *   normalize: (path: string) => string,
 *   relative: (from: string, to: string) => string,
 * }} WorktreePaths
 */

// Environment typing is local to the worktree runner.
/**
 * @typedef {Record<string, string | undefined>} Env
 */

/**
 * Create the Stryker worktree runner.
 * @param {{
 *   processModule: { env: Env },
 *   fsModule: WorktreeFilesystem,
 *   pathModule: WorktreePaths,
 *   spawnImpl: WorktreeSpawn,
 *   now: (permission: AllowEffects) => string,
 *   bindEffectBoundary: import('../../../types/allow-effects').AllowEffectsBoundary,
 *   rootDir?: string,
 *   mutateTargetDir?: string,
 *   log?: (permission: AllowEffects, message: string) => void,
 * }} options Runner dependencies.
 * @returns {() => Promise<void>} Runner handle.
 */
export function createRunStrykerWorktreeHandle(options) {
  const processModule = options.processModule;
  const fsModule = options.fsModule;
  const pathModule = options.pathModule;
  const spawnImpl = options.spawnImpl;
  const mainRoot = options.rootDir || pathModule.resolve('.');
  let mutateTargetDir = null;
  if (options.mutateTargetDir) {
    mutateTargetDir = pathModule.normalize(options.mutateTargetDir);
  }
  const worktreeParent = pathModule.join(mainRoot, '.worktrees');
  const worktreePrefix = pathModule.join(worktreeParent, 'stryker-');
  const worktreeStrykerConfig = 'stryker.worktree.config.mjs';
  const noDaemonEnv = {
    BEADS_NO_DAEMON: '1',
  };
  const reusedWorktreePath = processModule.env.STRYKER_REUSE_WORKTREE_PATH;
  const log = options.log ?? (() => {});

  /**
   * Bind command and logging adapters into a worktree command capability.
   * @param {{
   *   permission: AllowEffects,
   *   machineLogPath: string,
   *   baseEnv: Env,
   * }} dependencies Command adapters and shared environment.
   * @returns {(extraEnv: Env, step: { command: string, args: string[], cwd: string }) => Promise<void>} Configured command runner.
   */
  function createLoggedCommandStepRunner(dependencies) {
    const { machineLogPath, baseEnv, permission } = dependencies;
    return async function runLoggedCommandStep(extraEnv, step) {
      const { command, args, cwd } = step;
      await writeCommandLog(permission, machineLogPath, 'command-start', step);
      await runCommand(permission, {
        spawnImpl,
        command,
        args,
        cwd,
        env: buildChildEnv(baseEnv, extraEnv),
      });
      await writeCommandLog(
        permission,
        machineLogPath,
        'command-success',
        step
      );
    };
  }

  /**
   * Record a command lifecycle event.
   * @param {AllowEffects} permission Invocation permission.
   * @param {string} machineLogPath Machine log path.
   * @param {string} type Lifecycle event type.
   * @param {{ command: string, args: string[], cwd: string }} step Command step.
   * @returns {Promise<void>} Nothing.
   */
  function writeCommandLog(permission, machineLogPath, type, step) {
    return writeMachineLog(permission, machineLogPath, {
      type,
      command: step.command,
      args: step.args,
      cwd: step.cwd,
    });
  }

  /**
   * Append a machine-readable log entry that persists after teardown.
   * @param {AllowEffects} permission Invocation permission.
   * @param {string} logPath Destination log path.
   * @param {Record<string, unknown>} entry Log payload.
   * @returns {Promise<void>} Resolves once the entry is written.
   */
  async function writeMachineLog(permission, logPath, entry) {
    await fsModule.mkdir(permission, pathModule.dirname(logPath), {
      recursive: true,
    });
    await fsModule.appendFile(
      permission,
      logPath,
      `${JSON.stringify({ timestamp: options.now(permission), ...entry })}\n`
    );
  }

  return () =>
    options.bindEffectBoundary(async permission => {
      if (!reusedWorktreePath) {
        await fsModule.mkdir(permission, worktreeParent, { recursive: true });
      }

      const worktreePath =
        reusedWorktreePath ||
        (await fsModule.mkdtemp(permission, worktreePrefix));
      const reportSource = pathModule.join(worktreePath, 'reports/mutation');
      const reportTarget = pathModule.join(mainRoot, 'reports/mutation');
      const machineLogPath = pathModule.join(
        reportTarget,
        'worktree-run.jsonl'
      );
      const commandDependencies = {
        permission,
        machineLogPath,
        baseEnv: processModule.env,
      };
      const runLoggedCommandStep =
        createLoggedCommandStepRunner(commandDependencies);

      await fsModule.mkdir(permission, reportTarget, { recursive: true });
      await writeMachineLog(permission, machineLogPath, {
        type: 'start',
        mainRoot,
        worktreePath,
        reportTarget,
      });

      try {
        /** @type {Array<{command: string, args: string[], cwd: string}>} */
        let setupSteps = [];
        if (!reusedWorktreePath) {
          setupSteps = [
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
          ];
        }
        for (const step of setupSteps) {
          await runLoggedCommandStep(noDaemonEnv, step);
        }
        await fsModule.writeFile(
          permission,
          pathModule.join(worktreePath, worktreeStrykerConfig),
          buildStrykerConfig(mutateTargetDir, processModule.env)
        );
        await writeMachineLog(permission, machineLogPath, {
          type: 'config-written',
          filePath: pathModule.join(worktreePath, worktreeStrykerConfig),
        });
        await runLoggedCommandStep(
          {
            STRYKER_TEST_ENV: '1',
            ...noDaemonEnv,
          },
          {
            command: 'node',
            args: [
              '--experimental-vm-modules',
              './node_modules/.bin/stryker',
              'run',
              worktreeStrykerConfig,
            ],
            cwd: worktreePath,
          }
        );
        await writeMachineLog(permission, machineLogPath, {
          type: 'reports-sync-start',
          from: reportSource,
          to: reportTarget,
        });
        await fsModule.cp(permission, reportSource, reportTarget, {
          recursive: true,
        });
        await writeMachineLog(permission, machineLogPath, {
          type: 'reports-sync-success',
          from: reportSource,
          to: reportTarget,
        });
        log(
          permission,
          `Synced mutation reports to ${pathModule.relative(mainRoot, reportTarget)}`
        );
      } finally {
        await writeMachineLog(permission, machineLogPath, {
          type: 'cleanup-start',
          worktreePath,
        });
        if (!reusedWorktreePath) {
          await runCommand(permission, {
            spawnImpl,
            command: 'git',
            args: ['worktree', 'remove', '--force', worktreePath],
            cwd: mainRoot,
            env: buildChildEnv(processModule.env, noDaemonEnv),
          }).catch(() => {});
          await fsModule
            .rm(permission, worktreePath, { recursive: true, force: true })
            .catch(() => {});
        }
        await writeMachineLog(permission, machineLogPath, {
          type: 'cleanup-complete',
          worktreePath,
        });
      }
    });
}

export { runCommand };

/**
 * Merge child-process environment variables.
 * @param {Env} baseEnv Base environment.
 * @param {Env} overrides Override environment.
 * @returns {Env} Combined environment.
 */
function buildChildEnv(baseEnv, overrides) {
  return {
    ...baseEnv,
    ...overrides,
  };
}

/**
 * Build the temporary Stryker config for the worktree.
 * @param {string | null} mutateTargetDir Optional mutate target relative to the repo root.
 * @param {Env} env Injected runner configuration.
 * @returns {string} Serialized config module.
 */
function buildStrykerConfig(mutateTargetDir, env) {
  let mutateLine = '';
  if (mutateTargetDir) {
    mutateLine = `  mutate: [${JSON.stringify(mutateTargetDir)}],\n`;
  }
  const concurrency = Number(env.STRYKER_CONCURRENCY || 1);
  const testFiles = env.STRYKER_TEST_FILES;
  const testFilesLine = testFiles ? `  testFiles: ${testFiles},\n` : '';
  const timeoutMs = Number(env.STRYKER_TIMEOUT_MS || 10_000);
  return `import baseConfig from './stryker.config.mjs';

export default {
  ...baseConfig,
${mutateLine}  // Keep mutation runs resource-bounded in the worktree.
${testFilesLine}  
  timeoutMS: ${Number.isInteger(timeoutMs) && timeoutMs > 0 ? timeoutMs : 10_000},
  concurrency: ${Number.isInteger(concurrency) && concurrency > 0 ? concurrency : 1},
};
`;
}

/**
 * @param {AllowEffects} permission Invocation permission.
 * @param {{
 *   spawnImpl: WorktreeSpawn,
 *   command: string,
 *   args: string[],
 *   cwd: string,
 *   allowFailure?: boolean,
 *   env: Env,
 * }} options Command options.
 * @returns {Promise<void>} Resolves when the command exits successfully.
 */
async function runCommand(permission, options) {
  const spawnImpl = options.spawnImpl;
  const command = options.command;
  const args = options.args;
  const cwd = options.cwd;
  const allowFailure = options.allowFailure ?? false;
  const env = options.env;
  await new Promise(
    /**
     * @param {(value?: unknown) => void} resolve Promise resolver.
     * @param {(reason?: unknown) => void} reject Promise rejecter.
     */
    (resolve, reject) => {
      const child = spawnImpl(permission, command, args, {
        cwd,
        env,
        stdio: 'inherit',
      });
      child.once(permission, 'error', error =>
        handleCommandError(error, allowFailure, resolve, reject)
      );
      const handleExit =
        /** @param {number | null} code Child exit status. */ code => {
          if (code === 0) {
            resolve();
            return;
          }

          const error = new Error(
            `${command} ${args.join(' ')} exited with code ${code}`
          );
          handleCommandError(error, allowFailure, resolve, reject);
        };
      child.once(permission, 'exit', handleExit);
    }
  );
}

/**
 * Handle a spawned command error.
 * @param {unknown} error Spawn error.
 * @param {boolean} allowFailure Whether failures should be ignored.
 * @param {(value?: unknown) => void} resolve Promise resolver.
 * @param {(reason?: unknown) => void} reject Promise rejecter.
 * @returns {void}
 */
function handleCommandError(error, allowFailure, resolve, reject) {
  return allowFailure ? resolve() : reject(error);
}
