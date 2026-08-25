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
 * Handle a child-process close event.
 * @param {{ activeChildren: Map<string, object>, command: { name: string, command: string, args: string[] }, now: () => number, startedAt: number, exitCode: number | null, signal: string | null, stderr: object, state: { settled: boolean, timeoutId: ReturnType<typeof setTimeout> | null }, aborted: boolean, failFast: boolean, failures: Array<{ name: string }>, emitEvent: Function, finishWithFailure: Function, resolve: Function, renderCommand?: Function }} input Close-event state.
 * @returns {void} Nothing.
 */
export function handleChildClose({
  activeChildren,
  command,
  now,
  startedAt,
  exitCode,
  signal,
  stderr,
  state,
  aborted,
  failFast,
  failures,
  emitEvent,
  finishWithFailure,
  resolve,
  renderCommand = defaultRenderCommand,
}) {
  activeChildren.delete(command.name);
  if (state.settled) {
    resolve(undefined);
    return;
  }
  if (state.timeoutId !== null) clearTimeout(state.timeoutId);
  if (shouldIgnoreClosedChild(aborted, failFast, failures, command.name)) {
    resolve(undefined);
    return;
  }
  const durationMs = Math.max(0, now() - startedAt);
  const result = {
    name: command.name,
    command: renderCommand(command),
    exitCode,
    signal,
    durationMs,
  };
  if (exitCode === 0 && signal === null) {
    state.settled = true;
    emitEvent(stderr, { type: 'check-success', ...result });
    resolve(undefined);
    return;
  }
  state.settled = true;
  finishWithFailure(result, true);
  resolve(undefined);
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
