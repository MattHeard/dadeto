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
 * @typedef {object} CheckCommand
 * @property {string} name Check label.
 * @property {string} command Command to execute.
 * @property {string[]} args Command arguments.
 *
 * @typedef {object} CheckEvent
 * @property {'check-start' | 'check-success' | 'check-failure' | 'check-summary'} type Event type.
 * @property {string} name Check label.
 * @property {string} command Command string.
 * @property {number} [exitCode] Process exit code.
 * @property {string | null} [signal] Process termination signal.
 * @property {number} [durationMs] Elapsed time in milliseconds.
 * @property {string} [error] Spawn or runtime error description.
 * @property {CheckFailure[]} [failures] Failures observed across the suite.
 * @property {number} [total] Total number of checks.
 * @property {number} [failed] Number of failed checks.
 * @property {'passed' | 'failed'} [status] Overall suite status.
 *
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
export async function runCheckSuite(options = {}) {
  const {
    commands = CHECK_COMMANDS,
    failFast = false,
    spawnImpl = defaultSpawn,
    stdout = process.stdout,
    stderr = process.stderr,
    now = () => Date.now(),
  } = options;

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
    commands.map(command =>
      new Promise(resolve => {
        const startedAt = now();
        let child;

        if (failFast && aborted) {
          resolve();
          return;
        }

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

          resolve();
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
          if (aborted && failFast) {
            return;
          }

          const failure = buildSpawnFailure(command, startedAt, error, now);
          if (!aborted || !failFast) {
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
          }

          if (failFast && !aborted) {
            aborted = true;
            abortRemainingChildren(activeChildren, command.name);
          }
        });

        child.on('close', (exitCode, signal) => {
          activeChildren.delete(command.name);

          if (
            aborted &&
            failFast &&
            failures.length > 0 &&
            failures[0].name !== command.name
          ) {
            resolve();
            return;
          }

          const durationMs = Math.max(0, now() - startedAt);
          if (exitCode === 0 && signal === null) {
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

            if (!aborted || !failFast) {
              failures.push(failure);
              emitEvent(stderr, {
                type: 'check-failure',
                name: command.name,
                command: failure.command,
                exitCode: failure.exitCode,
                signal: failure.signal,
                durationMs: failure.durationMs,
              });
            }

            if (failFast && !aborted) {
              aborted = true;
              abortRemainingChildren(activeChildren, command.name);
            }
          }
          resolve();
        });
      })
    )
  );

  const exitCode = failures.length === 0 ? 0 : 1;
  emitEvent(stderr, {
    type: 'check-summary',
    name: 'check-suite',
    command: 'npm run check',
    status: exitCode === 0 ? 'passed' : 'failed',
    total: commands.length,
    failed: failures.length,
    failures,
  });

  return { exitCode, failures };
}

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

function buildSpawnFailure(command, startedAt, error, now) {
  return {
    name: command.name,
    command: renderCommand(command),
    exitCode: 1,
    signal: null,
    durationMs: Math.max(0, now() - startedAt),
    error: error instanceof Error ? error.message : String(error),
  };
}

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
    bufferState.text = lines.pop() ?? '';
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

function renderCommand(command) {
  return [command.command, ...command.args].join(' ');
}

function emitEvent(writer, event) {
  writer.write(`${JSON.stringify(event)}\n`);
}
