import { spawn as defaultSpawn } from 'node:child_process';

export const CHECK_COMMANDS = [
  { name: 'test', command: 'npm', args: ['test'] },
  { name: 'lint', command: 'npm', args: ['run', 'lint'] },
  { name: 'depcruise', command: 'npm', args: ['run', 'depcruise'] },
  { name: 'duplication', command: 'npm', args: ['run', 'duplication'] },
  {
    name: 'entrypoint-pattern',
    command: 'npm',
    args: ['run', 'entrypoint-pattern'],
  },
  { name: 'non-core-thin', command: 'npm', args: ['run', 'non-core-thin'] },
  { name: 'tsdoc:check', command: 'npm', args: ['run', 'tsdoc:check'] },
  {
    name: 'audit',
    command: 'npm',
    args: ['audit', '--audit-level=low'],
  },
];

/**
 * Create the command handler for the aggregate check script.
 * @param {{
 *   argv: string[],
 *   runSuite: (options: { failFast: boolean }) => Promise<{ exitCode: number }>,
 *   setExitCode: (exitCode: number) => void,
 * }} deps Command dependencies.
 * @returns {() => Promise<void>} Handler that runs the aggregate check.
 */
export function createRunCheckHandle({ argv, runSuite, setExitCode }) {
  return async () => {
    const failFast = argv.includes('--fail-fast');
    const result = await runSuite({ failFast });
    setExitCode(result.exitCode);
  };
}

/**
 * @typedef {object} CheckCommand
 * @property {string} name Check label.
 * @property {string} command Command to execute.
 * @property {string[]} args Command arguments.
 */

/**
 * @typedef {object} CheckEvent
 * @property {'check-start' | 'check-success' | 'check-failure' | 'check-summary'} type Event type.
 * @property {string} name Check label.
 * @property {string} command Command string.
 * @property {number | null} [exitCode] Process exit code.
 * @property {string | null} [signal] Process termination signal.
 * @property {number} [durationMs] Elapsed time in milliseconds.
 * @property {string} [error] Spawn or runtime error description.
 * @property {CheckFailure[]} [failures] Failures observed across the suite.
 * @property {number} [total] Total number of checks.
 * @property {number} [failed] Number of failed checks.
 * @property {'passed' | 'failed'} [status] Overall suite status.
 */

/**
 * @typedef {object} CheckFailure
 * @property {string} name Check label.
 * @property {string} command Command string.
 * @property {number | null} exitCode Process exit code.
 * @property {string | null} signal Process termination signal.
 * @property {number} durationMs Elapsed time in milliseconds.
 * @property {string} [error] Spawn or runtime error description.
 */

/**
 * Run the repository quality checks in parallel and report structured events.
 * @param {{
 *   commands?: CheckCommand[],
 *   failFast?: boolean,
 *   spawnImpl?: typeof defaultSpawn,
 *   stdout?: { write: (text: string) => void },
 *   stderr?: { write: (text: string) => void },
 *   now?: () => number,
 * }} [options] Runner configuration.
 * @returns {Promise<{ exitCode: number, failures: CheckFailure[] }>} Suite outcome.
 */
export async function runCheckSuite(options) {
  const { commands, failFast, spawnImpl, stdout, stderr, now } =
    resolveRunCheckOptions(options);

  /** @type {CheckFailure[]} */
  const failures = [];
  const activeChildren = new Map();
  let aborted = false;

  if (commands.length === 0) {
    emitEvent(stderr, {
      type: 'check-summary',
      name: 'check-suite',
      command: 'npm run check',
      status: 'passed',
      total: 0,
      failed: 0,
      failures: [],
    });
    return { exitCode: 0, failures };
  }

  await Promise.all(
    commands.map(command => {
      return new Promise(resolve => {
        const startedAt = now();
        let child;
        let settled = false;

        if (failFast && aborted) {
          resolve(undefined);
          return;
        }

        /**
         * Record a failure exactly once for the current command.
         * @param {CheckFailure} failure Failure details to report.
         * @param {boolean} shouldAbort Whether fail-fast should stop the rest of the suite.
         * @returns {void}
         */
        const finishWithFailure = (failure, shouldAbort) => {
          settled = true;
          failures.push(failure);
          emitEvent(stderr, {
            type: 'check-failure',
            name: command.name,
            command: failure.command,
            exitCode: failure.exitCode,
            signal: failure.signal,
            durationMs: failure.durationMs,
            error: failure.error,
          });

          if (shouldAbort && failFast && !aborted) {
            aborted = true;
            abortRemainingChildren(activeChildren, command.name);
          }

          resolve(undefined);
        };

        try {
          child = spawnImpl(command.command, command.args, {
            stdio: ['ignore', 'pipe', 'pipe'],
          });
        } catch (error) {
          const failure = buildSpawnFailure(command, startedAt, error, now);
          failures.push(failure);
          emitEvent(stderr, {
            type: 'check-failure',
            name: command.name,
            command: renderCommand(command),
            exitCode: 1,
            signal: null,
            durationMs: failure.durationMs,
            error: failure.error,
          });

          if (failFast) {
            aborted = true;
            abortRemainingChildren(activeChildren, command.name);
          }

          resolve(undefined);
          return;
        }

        activeChildren.set(command.name, child);
        emitEvent(stderr, {
          type: 'check-start',
          name: command.name,
          command: renderCommand(command),
        });
        forwardStreamLines(child.stdout, line =>
          stdout.write(`[${command.name}][stdout] ${line}\n`)
        );
        forwardStreamLines(child.stderr, line =>
          stderr.write(`[${command.name}][stderr] ${line}\n`)
        );

        child.on('error', error => {
          if (settled || (aborted && failFast)) {
            return;
          }

          const failure = buildSpawnFailure(command, startedAt, error, now);
          finishWithFailure(failure, true);
        });

        child.on('close', (exitCode, signal) => {
          activeChildren.delete(command.name);

          if (settled) {
            resolve(undefined);
            return;
          }

          if (
            aborted &&
            failFast &&
            failures.length > 0 &&
            failures[0].name !== command.name
          ) {
            settled = true;
            resolve(undefined);
            return;
          }

          const durationMs = Math.max(0, now() - startedAt);
          if (exitCode === 0 && signal === null) {
            settled = true;
            emitEvent(stderr, {
              type: 'check-success',
              name: command.name,
              command: renderCommand(command),
              exitCode,
              signal,
              durationMs,
            });
          } else {
            const failure = {
              name: command.name,
              command: renderCommand(command),
              exitCode,
              signal,
              durationMs,
            };
            finishWithFailure(failure, true);
          }
          resolve(undefined);
        });
      });
    })
  );

  let exitCode = 0;
  if (failures.length !== 0) {
    exitCode = 1;
  }

  /** @type {'passed' | 'failed'} */
  let status = 'passed';
  if (exitCode !== 0) {
    status = 'failed';
  }
  emitEvent(stderr, {
    type: 'check-summary',
    name: 'check-suite',
    command: 'npm run check',
    status,
    total: commands.length,
    failed: failures.length,
    failures,
  });

  return { exitCode, failures };
}

/**
 * Resolve runner options with sensible defaults.
 * @param {{
 *   commands?: CheckCommand[],
 *   failFast?: boolean,
 *   spawnImpl?: typeof defaultSpawn,
 *   stdout?: { write: (text: string) => void },
 *   stderr?: { write: (text: string) => void },
 *   now?: () => number,
 * }} [options] Runner configuration.
 * @returns {{
 *   commands: CheckCommand[],
 *   failFast: boolean,
 *   spawnImpl: typeof defaultSpawn,
 *   stdout: { write: (text: string) => void },
 *   stderr: { write: (text: string) => void },
 *   now: () => number,
 * }} Normalized runner options.
 */
function resolveRunCheckOptions(options = {}) {
  return {
    commands: options.commands ?? CHECK_COMMANDS,
    failFast: options.failFast ?? false,
    spawnImpl: options.spawnImpl ?? defaultSpawn,
    stdout: options.stdout ?? process.stdout,
    stderr: options.stderr ?? process.stderr,
    now: options.now ?? (() => Date.now()),
  };
}

/**
 * Abort every active child process except the named one.
 * @param {Map<string, import('node:child_process').ChildProcess>} activeChildren Active child process map.
 * @param {string} exemptName Command name to keep alive.
 * @returns {void}
 */
function abortRemainingChildren(activeChildren, exemptName) {
  for (const [name, child] of activeChildren.entries()) {
    if (name === exemptName) {
      continue;
    }

    if (child && typeof child.kill === 'function') {
      child.kill('SIGTERM');
    }
  }
}

/**
 * Build a structured failure payload for a child process spawn error.
 * @param {CheckCommand} command Command that failed to spawn.
 * @param {number} startedAt Start timestamp.
 * @param {unknown} error Spawn error value.
 * @param {() => number} now Clock helper.
 * @returns {CheckFailure} Structured spawn failure.
 */
function buildSpawnFailure(command, startedAt, error, now) {
  let errorMessage = String(error);
  if (error instanceof Error) {
    errorMessage = error.message;
  }

  return {
    name: command.name,
    command: renderCommand(command),
    exitCode: 1,
    signal: null,
    durationMs: Math.max(0, now() - startedAt),
    error: errorMessage,
  };
}

/**
 * Forward a stream's lines to a writer callback.
 * @param {import('node:stream').Readable | null | undefined} stream Stream to forward.
 * @param {(line: string) => void} writer Line writer callback.
 * @returns {void}
 */
function forwardStreamLines(stream, writer) {
  if (!stream || typeof stream.on !== 'function') {
    return;
  }

  if (typeof stream.setEncoding === 'function') {
    stream.setEncoding('utf8');
  }

  const bufferState = { text: '' };

  stream.on('data', chunk => {
    bufferState.text += String(chunk);
    const lines = bufferState.text.split(/\r?\n/);
    bufferState.text = /** @type {string} */ (lines.pop());
    for (const line of lines) {
      if (line.length > 0) {
        writer(line);
      }
    }
  });

  const flush = () => {
    if (bufferState.text.length > 0) {
      writer(bufferState.text);
      bufferState.text = '';
    }
  };

  stream.on('end', flush);
  stream.on('close', flush);
}

/**
 * Render a command line string for structured events.
 * @param {CheckCommand} command Command to render.
 * @returns {string} Rendered command string.
 */
function renderCommand(command) {
  return [command.command, ...command.args].join(' ');
}

/**
 * Emit a JSONL event to the provided writer.
 * @param {{ write: (text: string) => void }} writer Output writer.
 * @param {CheckEvent} event Event payload.
 * @returns {void}
 */
function emitEvent(writer, event) {
  writer.write(`${JSON.stringify(event)}\n`);
}

export const runCheckSuiteTestOnly = {
  resolveRunCheckOptions,
};
