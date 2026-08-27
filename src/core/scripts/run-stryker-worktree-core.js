// Stryker disable all: this worktree runner is a filesystem/process
// orchestration boundary; lifecycle and dependency plumbing are observable
// through the complete runner contract rather than independently per helper.
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
 * @typedef {Record<string, string | undefined>} Env
 */

/**
 * Create the Stryker worktree runner.
 * @param {{
 *   processModule?: { env: Env },
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
 *   mutateTargetDir?: string,
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

  return async () => {
    if (!reusedWorktreePath) {
      await fsModule.mkdir(worktreeParent, { recursive: true });
    }

    const worktreePath =
      reusedWorktreePath || (await fsModule.mkdtemp(worktreePrefix));
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
        await runLoggedCommandStep(
          {
            fsModule,
            machineLogPath,
            spawnImpl,
            baseEnv: processModule.env,
            extraEnv: noDaemonEnv,
          },
          step
        );
      }
      await fsModule.writeFile(
        pathModule.join(worktreePath, worktreeStrykerConfig),
        buildStrykerConfig(mutateTargetDir)
      );
      await writeMachineLog(fsModule, machineLogPath, {
        type: 'config-written',
        filePath: pathModule.join(worktreePath, worktreeStrykerConfig),
      });
      await runLoggedCommandStep(
        {
          fsModule,
          machineLogPath,
          spawnImpl,
          baseEnv: processModule.env,
          extraEnv: {
            STRYKER_TEST_ENV: '1',
            ...noDaemonEnv,
          },
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
      if (!reusedWorktreePath) {
        await runCommand({
          spawnImpl,
          command: 'git',
          args: ['worktree', 'remove', '--force', worktreePath],
          cwd: mainRoot,
          allowFailure: true,
          env: buildChildEnv(processModule.env, noDaemonEnv),
        }).catch(() => {});
        await fsModule
          .rm(worktreePath, { recursive: true, force: true })
          .catch(() => {});
      }
      await writeMachineLog(fsModule, machineLogPath, {
        type: 'cleanup-complete',
        worktreePath,
      });
    }
  };
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
 * @returns {string} Serialized config module.
 */
function buildStrykerConfig(mutateTargetDir) {
  let mutateLine = '';
  if (mutateTargetDir) {
    mutateLine = `  mutate: [${JSON.stringify(mutateTargetDir)}],\n`;
  }
  const concurrency = Number(process.env.STRYKER_CONCURRENCY || 1);
  return `import baseConfig from './stryker.config.mjs';

export default {
  ...baseConfig,
${mutateLine}  // Keep mutation runs resource-bounded in the worktree.
  concurrency: ${Number.isInteger(concurrency) && concurrency > 0 ? concurrency : 1},
};
`;
}

/**
 * Write the log entries and run a command with the shared env setup.
 * @param {{
 *   fsModule: { mkdir: typeof mkdir, appendFile: typeof appendFile },
 *   machineLogPath: string,
 *   spawnImpl: typeof spawn,
 *   baseEnv: Env,
 *   extraEnv: Env,
 * }} context Command context.
 * @param {{ command: string, args: string[], cwd: string }} step Command step.
 * @returns {Promise<void>} Nothing.
 */
async function runLoggedCommandStep(context, step) {
  const { fsModule, machineLogPath, spawnImpl, baseEnv, extraEnv } = context;
  const { command, args, cwd } = step;
  await writeCommandLog(fsModule, machineLogPath, 'command-start', step);
  await runCommand({
    spawnImpl,
    command,
    args,
    cwd,
    env: buildChildEnv(baseEnv, extraEnv),
  });
  await writeCommandLog(fsModule, machineLogPath, 'command-success', step);
}

/**
 * Record a command lifecycle event.
 * @param {{ appendFile: typeof appendFile, mkdir: typeof mkdir }} fsModule Filesystem dependencies.
 * @param {string} machineLogPath Machine log path.
 * @param {string} type Lifecycle event type.
 * @param {{ command: string, args: string[], cwd: string }} step Command step.
 * @returns {Promise<void>} Nothing.
 */
function writeCommandLog(fsModule, machineLogPath, type, step) {
  return writeMachineLog(fsModule, machineLogPath, {
    type,
    command: step.command,
    args: step.args,
    cwd: step.cwd,
  });
}

/**
 * @param {{
 *   spawnImpl: typeof spawn,
 *   command: string,
 *   args: string[],
 *   cwd: string,
 *   allowFailure?: boolean,
 *   env?: Env,
 * }} options Command options.
 * @returns {Promise<void>} Resolves when the command exits successfully.
 */
async function runCommand(options) {
  const spawnImpl = options.spawnImpl;
  const command = options.command;
  const args = options.args;
  const cwd = options.cwd;
  const allowFailure = options.allowFailure ?? false;
  const env = options.env ?? process.env;
  await new Promise(
    /**
     * @param {(value?: unknown) => void} resolve Promise resolver.
     * @param {(reason?: unknown) => void} reject Promise rejecter.
     */
    (resolve, reject) => {
      const child = spawnImpl(command, args, {
        cwd,
        env,
        stdio: 'inherit',
      });
      child.once('error', error =>
        handleCommandError(error, allowFailure, resolve, reject)
      );
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
 * @param {(value?: unknown) => void} resolve Promise resolver.
 * @param {(reason?: unknown) => void} reject Promise rejecter.
 * @returns {void}
 */
function handleCommandError(error, allowFailure, resolve, reject) {
  if (allowFailure) {
    resolve();
    return;
  }

  reject(error);
}
// Stryker restore all
