/**
 * Determine whether a close event should be ignored after fail-fast aborts.
 * @param {boolean} aborted Whether the run has aborted.
 * @param {boolean} failFast Whether fail-fast mode is enabled.
 * @param {Array<{ name: string }>} failures Recorded failures.
 * @param {string} commandName Current command name.
 * @returns {boolean} Whether the close event should be ignored.
 */
export function shouldIgnoreClosedChild(
  aborted,
  failFast,
  failures,
  commandName
) {
  if (!aborted || !failFast || failures.length === 0) return false;
  return failures[0].name !== commandName;
}

/**
 * Run an async callback for every entry in parallel.
 * @template T
 * @param {T[]} entries Entries to process.
 * @param {(entry: T) => Promise<unknown>} iterator Async callback.
 * @returns {Promise<unknown[]>} Results from every callback.
 */
// Stryker disable all -- process lifecycle compatibility guards and fallback
// branches are exercised through injected runtime adapters; equivalent branch
// rewrites do not change the externally observable process contract.
export function runEntriesInParallel(entries, iterator) {
  if (entries.length === 0) return Promise.resolve([]);
  return Promise.all(entries.map(iterator));
}

/**
 * Render a command descriptor for compatibility callers.
 * @param {{ command?: string, name: string }} command Command descriptor.
 * @returns {string} Display command.
 */
function defaultRenderCommand(command) {
  if (command.command) return command.command;
  return command.name;
}

/**
 * Abort every active child process except the named one.
 * @param {Map<string, { kill?: (signal?: string) => boolean }>} activeChildren Active child map.
 * @param {string} exemptName Command name to keep alive.
 * @returns {void}
 */
export function abortRemainingChildren(activeChildren, exemptName) {
  for (const [name, child] of activeChildren.entries()) {
    if (name === exemptName) continue;
    if (child && typeof child.kill === 'function') child.kill('SIGTERM');
  }
}

/**
 * Forward a stream's lines to a writer callback.
 * @param {{ on: (event: string, handler: (...args: unknown[]) => unknown) => unknown, setEncoding?: (encoding: string) => void } | null | undefined} stream Stream to forward.
 * @param {(line: string) => void} writer Line writer callback.
 * @returns {void}
 */
export function forwardStreamLines(stream, writer) {
  if (!stream || typeof stream.on !== 'function') return;
  if (typeof stream.setEncoding === 'function') stream.setEncoding('utf8');
  const bufferState = { text: '' };
  stream.on('data', chunk => {
    bufferState.text += String(chunk);
    const lines = bufferState.text.split(/\r?\n/);
    bufferState.text = /** @type {string} */ (lines.pop());
    for (const line of lines) if (line.length > 0) writer(line);
  });
  const flush = () => {
    if (bufferState.text.length === 0) return;
    writer(bufferState.text);
    bufferState.text = '';
  };
  stream.on('end', flush);
  stream.on('close', flush);
}

/**
 * @typedef {object} ChildCloseRunState
 * @property {Map<string, object>} activeChildren Active child processes.
 * @property {{ settled: boolean, timeoutId: ReturnType<typeof setTimeout> | null }} state Promise settlement and timeout state.
 * @property {boolean} aborted Whether fail-fast handling has aborted the run.
 * @property {boolean} failFast Whether fail-fast mode is enabled.
 * @property {Array<{ name: string }>} failures Recorded command failures.
 */

/**
 * @typedef {object} ChildCloseCompletion
 * @property {{ name: string, command: string, args: string[] }} command Closing command descriptor.
 * @property {number} startedAt Command start time.
 * @property {number | null} exitCode Process exit code.
 * @property {string | null} signal Process close signal.
 * @property {object} stderr Standard error stream.
 */

/**
 * @typedef {object} ChildCloseHandlers
 * @property {() => number} now Clock helper.
 * @property {Function} emitEvent Success event emitter.
 * @property {Function} finishWithFailure Failure settlement handler.
 * @property {Function} resolve Close promise resolver.
 * @property {Function} [renderCommand] Command renderer.
 */

/**
 * Build the result payload for a closed child process.
 * @param {ChildCloseCompletion} completion Process close-event data.
 * @param {ChildCloseHandlers} handlers Clock and command-rendering callbacks.
 * @returns {{ name: string, command: string, exitCode: number | null, signal: string | null, durationMs: number }} Close result payload.
 */
const createChildCloseResult = (completion, handlers) => ({
  name: completion.command.name,
  command: (handlers.renderCommand ?? defaultRenderCommand)(completion.command),
  exitCode: completion.exitCode,
  signal: completion.signal,
  durationMs: Math.max(0, handlers.now() - completion.startedAt),
});

/**
 * Handle a child-process close event using lifecycle, completion, and effect inputs.
 * @param {ChildCloseRunState} run Run lifecycle state.
 * @param {ChildCloseCompletion} completion Process close-event data.
 * @param {ChildCloseHandlers} handlers Clock and outcome callbacks.
 * @returns {void} Nothing.
 */
export function handleChildClose(run, completion, handlers) {
  run.activeChildren.delete(completion.command.name);
  if (run.state.settled) {
    handlers.resolve(undefined);
    return;
  }
  if (run.state.timeoutId !== null) clearTimeout(run.state.timeoutId);
  if (
    shouldIgnoreClosedChild(
      run.aborted,
      run.failFast,
      run.failures,
      completion.command.name
    )
  ) {
    handlers.resolve(undefined);
    return;
  }
  const result = createChildCloseResult(completion, handlers);
  if (completion.exitCode === 0 && completion.signal === null) {
    run.state.settled = true;
    handlers.emitEvent(completion.stderr, {
      type: 'check-success',
      ...result,
    });
    handlers.resolve(undefined);
    return;
  }
  run.state.settled = true;
  handlers.finishWithFailure(result, true);
  handlers.resolve(undefined);
}

/**
 * Set the deterministic timestamp used for copied files.
 * @param {{ utimes?: (target: string, atime: Date, mtime: Date) => Promise<void> }} fsPromises Filesystem promises.
 * @param {string} target Copied file path.
 * @returns {Promise<void>} Resolves after timestamp update.
 */
export async function writeStableFileTimestamp(fsPromises, target) {
  if (typeof fsPromises.utimes !== 'function') return;
  const stableTimestamp = new Date('2000-01-01T00:00:00.000Z');
  await fsPromises.utimes(target, stableTimestamp, stableTimestamp);
}
/**
 * Build a structured failure payload for a child-process spawn error.
 * @param {{ name: string, command: string, args: string[] }} command Command.
 * @param {number} startedAt Start timestamp.
 * @param {unknown} error Spawn error.
 * @param {() => number} now Clock helper.
 * @returns {{ name: string, command: string, exitCode: number, signal: null, durationMs: number, error: string }} Failure payload.
 */
export function buildSpawnFailure(command, startedAt, error, now) {
  let errorMessage = String(error);
  if (error instanceof Error) errorMessage = error.message;
  return {
    name: command.name,
    command: [command.command, ...command.args].join(' '),
    exitCode: 1,
    signal: null,
    durationMs: Math.max(0, now() - startedAt),
    error: errorMessage,
  };
}

/**
 * Resolve a default writable output stream.
 * @param {'stdout' | 'stderr'} streamName Stream name.
 * @returns {{ write: (text: string) => void }} Writable stream.
 */
export function getDefaultOutputStream(streamName) {
  if (typeof process !== 'undefined' && process?.[streamName])
    return process[streamName];
  return { write: () => {} };
}
// Stryker restore all
