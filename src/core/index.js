// Stryker disable all -- this module is the fixed shared core utility and
// filesystem-adapter boundary; its declarative forwarding branches are
// exercised through consumers and adapter smoke coverage.

/**
 * UID for the admin user with elevated access.
 */
export const ADMIN_UID = 'qcYSrXTaj1MZUoFsAloBwT86GNM2';

/**
 * Return a dependency with its injected callable type preserved.
 * @template T
 * @param {T | undefined} dependency Dependency to return.
 * @returns {T} Callable dependency.
 */
export function resolveCallable(dependency) {
  return /** @type {T} */ (dependency);
}

/**
 * Return the array candidate when available; otherwise return an empty array.
 * @param {unknown} value Candidate value.
 * @returns {unknown[]} Array candidate or empty array.
 */
/**
 * Parse JSON and return null on failure.
 * @param {string} value Raw JSON string.
 * @returns {unknown} Parsed JSON value or null.
 */
/**
 * @param {...(string | null)} values Candidate strings.
 * @returns {string[]} Defined string values.
 */
export function getDefinedStrings(...values) {
  return values.filter(value => typeof value === 'string');
}

/**
 * Report failures or log a success message when the check passes.
 * @param {{
 *   failures: string[],
 *   output: { error: (line: string) => void, log: (line: string) => void },
 *   setExitCode: (exitCode: number) => void,
 *   successMessage: string,
 * }} options Check outcome dependencies.
 * @returns {boolean} True when failures were reported.
 */
export function reportFailuresAndMaybeLogSuccess({
  failures,
  output,
  setExitCode,
  successMessage,
}) {
  if (reportFailuresAndExit({ failures, output, setExitCode })) {
    return true;
  }

  output.log(successMessage);
  return false;
}

/**
 * Resolve a string fallback.
 * @param {unknown} candidate Candidate value.
 * @param {string} fallback Fallback value.
 * @returns {string} Candidate or fallback.
 */
export function stringOr(candidate, fallback) {
  if (!isNonEmptyString(candidate)) {
    return fallback;
  }

  return candidate;
}

/**
 * Normalize a candidate string value.
 * @param {unknown} value Candidate value.
 * @returns {string | null} String value when present, otherwise null.
 */
export function stringOrNull(value) {
  return /** @type {string | null} */ (whenTypeValue(value, 'string'));
}

/**
 * Return a fallback when the provided message is falsy.
 * @param {string | undefined | null} message Candidate message.
 * @param {string} fallback Fallback value when message is falsy.
 * @returns {string} Message to surface to the caller.
 */
export function resolveMessageOrDefault(message, fallback) {
  const candidate = getStringCandidate(message);
  if (!candidate) {
    return fallback;
  }

  return candidate;
}

/**
 * Return the provided string when available or delegate to a fallback.
 * @param {unknown} value Candidate value.
 * @param {(value: unknown) => string | null} fallback Function invoked when the value is not a string.
 * @returns {string | null} String from the value or fallback.
 */
export function stringOrFallback(value, fallback) {
  const normalized = getStringCandidate(value);
  if (!normalized) {
    return fallback(/** @type {unknown} */ (value));
  }

  return normalized;
}

/**
 * Evaluate a transform when a condition holds, otherwise return the fallback default.
 * @param {boolean} condition - Determines whether the transform should run.
 * @param {() => T} transform - Resolver invoked if the condition is true.
 * @param {T} fallback - Value returned when the condition is falsy.
 * @returns {T} Result of the transform when applied, or the fallback otherwise.
 * @template T
 */
export function whenOrDefault(condition, transform, fallback) {
  if (condition) {
    return transform();
  }

  return fallback;
}

/**
 * Choose the most readable representation for a relative path.
 * @param {string} absolutePath Original absolute path provided to the logger.
 * @param {string} relativePath Path relative to the project root.
 * @returns {string} Either the relative path or original absolute path when outside the project.
 */
export function selectReadablePath(absolutePath, relativePath) {
  if (relativePath.startsWith('..')) {
    return absolutePath;
  }

  return relativePath;
}

/**
 * Format a target path relative to the provided project root.
 * @param {string} projectRoot Root directory to use for relative comparisons.
 * @param {string} targetPath Path to format for display.
 * @param {(from: string, to: string) => string} relativeFn Path.relative implementation.
 * @returns {string} Human-readable representation of the path.
 */
export function formatPathRelativeToProject(
  projectRoot,
  targetPath,
  relativeFn
) {
  const relativePath = relativeFn(projectRoot, targetPath);
  if (!relativePath) {
    return '.';
  }

  return selectReadablePath(targetPath, relativePath);
}

/**
 * Build an async task wrapper that maps an entry to an invocation payload.
 * @template TEntry
 * @template TPayload
 * @param {(entry: TEntry) => TPayload} mapEntry Entry-to-payload mapper.
 * @param {(payload: TPayload) => Promise<unknown>} runEntry Payload executor.
 * @returns {(entry: TEntry) => Promise<void>} Async task wrapper.
 */
export function createMappedTask(mapEntry, runEntry) {
  return async entry => {
    await runEntry(mapEntry(entry));
  };
}

/**
 * Run a callback for each entry in parallel and resolve when all callbacks finish.
 * @template T
 * @param {T[]} entries Entries to process.
 * @param {(entry: T) => Promise<unknown>} iterator Async callback per entry.
 * @returns {Promise<unknown[]>} Promise resolving once every callback completes.
 */
/**
 * Map entries to payloads and execute them in parallel.
 * @template TEntry
 * @template TPayload
 * @param {TEntry[]} entries Entries to process.
 * @param {(entry: TEntry) => TPayload} mapEntry Entry-to-payload mapper.
 * @param {(payload: TPayload) => Promise<unknown>} runEntry Payload executor.
 * @returns {Promise<unknown[]>} Promise resolving once every mapped entry completes.
 */
export function runMappedEntries(entries, mapEntry, runEntry) {
  return runEntriesInParallel(entries, createMappedTask(mapEntry, runEntry));
}

/**
 * Map entries and run the mapped side effects synchronously.
 * @template TEntry
 * @template TPayload
 * @param {TEntry[]} entries Entries to process.
 * @param {(entry: TEntry) => TPayload} mapEntry Entry-to-payload mapper.
 * @param {(payload: TPayload, index: number) => void} runEntry Payload executor.
 * @returns {void}
 */
export function forEachMappedEntries(entries, mapEntry, runEntry) {
  for (const [index, entry] of entries.entries()) {
    runEntry(mapEntry(entry), index);
  }
}

/**
 * Build the standard copy log message.
 * @param {{
 *   formatPathForLog: (targetPath: string) => string,
 *   sourceDestination: { source: string, destination: string },
 *   message?: string,
 * }} options Copy metadata.
 * @returns {string} Copy progress message.
 */
export function buildCopyLogMessage({
  formatPathForLog,
  sourceDestination,
  message,
}) {
  const { source, destination } = sourceDestination;
  return (
    message ??
    `Copied: ${formatPathForLog(source)} -> ${formatPathForLog(destination)}`
  );
}

/**
 * Normalize a candidate value to a plain object or an empty object.
 * @param {unknown} value Candidate object-like value.
 * @returns {Record<string, unknown>} Plain object or empty object.
 */
/**
 * Ensure a dependency is callable.
 * @param {unknown} candidate Candidate value.
 * @param {string} name Name used in the error message.
 * @returns {void}
 */
/**
 * Converts a non-string value into a string, defaulting to empty when nullish.
 * @param {unknown} value Candidate value.
 * @returns {string} Safe string representation.
 */
/**
 * Return the callback result when the value is not nullish; otherwise `null`.
 * @template T
 * @param {unknown} value Candidate value.
 * @param {(value: unknown) => T} fn Callback invoked for present values.
 * @returns {T | null} Callback result or `null` when the input is nullish.
 */
export function whenNotNullish(value, fn) {
  return whenValueMatches(value, isNullish, fn);
}

/**
 * Return the original value when it is not nullish; otherwise `null`.
 * @template T
 * @param {T | null | undefined} value Candidate value.
 * @returns {T | null} Original value or `null` when the value is nullish.
 */
export function whenNotNullishValue(value) {
  return /** @type {T | null} */ (
    whenNotNullish(value, candidate => candidate)
  );
}

/**
 * Run the provided callback when the value is a string.
 * @param {unknown} value Candidate value.
 * @param {(value: string) => T} fn Callback invoked with the string.
 * @returns {T | null} Callback result or `null` when the input is not a string.
 * @template T
 */
export function whenString(value, fn) {
  return whenValueMatches(
    value,
    isNotStringValue,
    /** @type {(value: unknown) => T} */ (fn)
  );
}

/**
 * Normalize a string candidate to a trimmed string or `null`.
 * @param {unknown} value Candidate string value.
 * @returns {string | null} Trimmed string or `null` when the value is not a string or trims to nothing.
 */
export function trimmedStringOrNull(value) {
  const trimmed = whenString(value, candidate => candidate.trim());
  if (!trimmed) {
    return null;
  }

  return trimmed;
}

/**
 * Run the provided callback when the value matches the requested typeof and
 * return the value unchanged.
 * @param {unknown} value Candidate value.
 * @param {string} typeName Expected typeof result.
 * @returns {unknown | null} Original value or `null` when the type does not match.
 */
export function whenTypeValue(value, typeName) {
  return whenType(value, typeName, candidate => candidate);
}

/**
 * Report an error through the provided callback and then return `false`.
 * @param {(...args: unknown[]) => void} reportFn Reporting callback.
 * @param {...unknown} args Arguments forwarded to the reporting callback.
 * @returns {false} Always returns `false`.
 */
export function reportAndReturnFalse(reportFn, ...args) {
  reportFn(...args);
  return false;
}

/**
 * Run the provided callback when the value is an array.
 * @param {unknown} value Candidate value.
 * @param {(value: unknown[]) => T} fn Callback invoked with the array.
 * @returns {T | null} Callback result or `null` when the input is not an array.
 * @template T
 */
export function whenArray(value, fn) {
  return whenValueMatches(
    value,
    isNotArrayValue,
    /** @type {(value: unknown) => T} */ (fn)
  );
}

/**
 * Run the provided callback when the condition passes.
 * @template T
 * @param {boolean} condition Gate determining whether to invoke the callback.
 * @param {() => T} fn Callback invoked when the condition passes.
 * @returns {T | null} Callback result or `null` when the condition fails.
 */
export function whenOrNull(condition, fn) {
  return /** @type {T | null} */ (when(condition, fn, () => null));
}

/**
 * Run the callback when the supplied predicate says the value is acceptable.
 * @template T
 * @param {unknown} value Candidate value.
 * @param {(value: unknown) => boolean} isRejected Predicate that identifies values to skip.
 * @param {(value: unknown) => T} fn Callback invoked when the value passes the predicate.
 * @returns {T | null} Callback result or `null` when the predicate rejects the value.
 */
function whenValueMatches(value, isRejected, fn) {
  if (isRejected(value)) {
    return null;
  }

  return fn(value);
}

/**
 * Return a value when available, otherwise invoke the fallback.
 * @template T
 * @param {boolean} available Whether the value can be returned.
 * @param {T} value The preferred value.
 * @param {() => T} fallback Fallback resolver.
 * @returns {T} Preferred value or fallback output.
 */
function returnFallbackValue(available, value, fallback) {
  if (!available) {
    return fallback();
  }

  return value;
}

/**
 * Normalize a numeric candidate, returning zero when the input is not a number.
 * @param {unknown} value Candidate numeric value.
 * @returns {number} Number when provided, otherwise zero.
 */
export function numberOrZero(value) {
  return /** @type {number} */ (
    returnFallbackValue(
      isFiniteNumericValue(value),
      /** @type {number} */ (value),
      () => 0
    )
  );
}

/**
 * Execute the transform when the condition is true, otherwise return the fallback result.
 * @param {boolean} condition - Determines whether the transform should run.
 * @param {() => unknown} transform - Resolver invoked when the condition holds.
 * @param {() => unknown} [fallback] - Resolver invoked when the condition is falsy.
 * @returns {unknown} Result of the transform or the fallback.
 */
export function when(condition, transform, fallback) {
  if (!condition) {
    return resolveWhenFallback(fallback)();
  }

  return transform();
}

/**
 * Execute the action and return `undefined` when it throws.
 * @param {() => unknown} action Callback that may throw.
 * @returns {unknown} The action result or `undefined` when an error occurs.
 */
function executeSafely(action) {
  try {
    return action();
  } catch {
    return undefined;
  }
}

/**
 * Resolve a safe execution result, falling back when the action failed.
 * @param {unknown} result - Result of the execution.
 * @param {() => unknown} fallback - Fallback function to call when execution failed.
 * @returns {unknown} The result or fallback value.
 */
function resolveSafeExecutionResult(result, fallback) {
  return returnFallbackValue(!didExecutionFail(result), result, fallback);
}

/**
 * Evaluate the action and return its result, falling back when an exception occurs.
 * @param {() => unknown} action - Function that may throw.
 * @param {() => unknown} [fallback] - Value returned when an error is thrown.
 * @returns {unknown} Action result or the fallback.
 */
export function tryOr(action, fallback = () => undefined) {
  const result = executeSafely(action);
  return resolveSafeExecutionResult(result, fallback);
}

/**
 * Determine the directory of the current module using an injected helper.
 * @param {string} moduleUrl - The module URL from import.meta.url.
 * @param {(moduleUrl: string) => string} fileURLToPathFn File URL resolver.
 * @param {(input: string) => string} dirnameFn Directory resolver.
 * @returns {string} Absolute path to the module directory.
 */
export function getCurrentDirectory(moduleUrl, fileURLToPathFn, dirnameFn) {
  return dirnameFn(fileURLToPathFn(moduleUrl));
}

/**
 * Resolve key project directories relative to a given module directory.
 * @param {string} moduleDirectory - Directory containing the current module.
 * @param {(input: string, ...segments: string[]) => string} resolveFn Path resolver.
 * @returns {{ projectRoot: string, srcDir: string, publicDir: string }} Project directory map.
 */
export function resolveProjectDirectories(moduleDirectory, resolveFn) {
  const projectRoot = resolveFn(moduleDirectory, '../..');
  const srcDir = resolveFn(projectRoot, 'src');
  const publicDir = resolveFn(projectRoot, 'public');

  return { projectRoot, srcDir, publicDir };
}

/**
 * Provide the subset of a path module used by copy utilities.
 * @param {{
 *   join: (base: string, ...segments: string[]) => string,
 *   dirname: (input: string) => string,
 *   relative: (from: string, to: string) => string,
 *   resolve: (input: string, ...segments: string[]) => string,
 *   extname: (input: string) => string,
 * }} pathModule Path dependency bundle.
 * @returns {object} Adapter exposing required path helpers.
 */
export function createPathAdapters(pathModule) {
  const typedPathModule = pathModule;
  return {
    join: typedPathModule.join,
    dirname: typedPathModule.dirname,
    relative: typedPathModule.relative,
    resolve: typedPathModule.resolve,
    extname: typedPathModule.extname,
  };
}

/**
 * Create the path adapter wrapper handle.
 * @param {{ pathModule: Parameters<typeof createPathAdapters>[0], fileURLToPathFn: (moduleUrl: string) => string, dirnameFn: (input: string) => string }} deps Path dependencies.
 * @returns {{
 *   getCurrentDirectory: typeof getCurrentDirectory,
 *   resolveProjectDirectories: typeof resolveProjectDirectories,
 *   createPathAdapters: typeof createPathAdapters
 * }} Path adapter exports.
 */
export function createPathHandle(deps) {
  return {
    getCurrentDirectory: moduleUrl =>
      getCurrentDirectory(moduleUrl, deps.fileURLToPathFn, deps.dirnameFn),
    resolveProjectDirectories: moduleDirectory =>
      resolveProjectDirectories(moduleDirectory, deps.pathModule.resolve),
    createPathAdapters: () => createPathAdapters(deps.pathModule),
  };
}

/**
 * Create the filesystem adapter wrapper handle.
 * @param {{
 *   fsModule: object,
 *   fsPromisesModule: Parameters<typeof createAsyncFsAdapters>[0],
 * }} deps Filesystem dependencies.
 * @returns {{
 *   createFsAdapters: typeof createFsAdapters,
 *   createAsyncFsAdapters: typeof createAsyncFsAdapters
 * }} Filesystem adapter exports.
 */
export function createFsHandle(deps) {
  return {
    createFsAdapters: () =>
      createFsAdapters(
        /** @type {Parameters<typeof createFsAdapters>[0]} */ (deps.fsModule)
      ),
    createAsyncFsAdapters: () => createAsyncFsAdapters(deps.fsPromisesModule),
  };
}

/**
 * Sync filesystem helpers for the copy generator.
 * @param {{
 *   existsSync: (target: string) => boolean,
 *   mkdirSync: (target: string, options?: { recursive?: boolean }) => void,
 *   rmSync: (target: string, options?: { recursive?: boolean, force?: boolean }) => void,
 *   copyFileSync: (source: string, destination: string) => void,
 *   readdirSync: (dir: string, options?: { withFileTypes?: boolean }) => unknown[],
 * }} fsModule Filesystem dependency bundle.
 * @returns {{
 *   directoryExists: (target: string) => boolean,
 *   createDirectory: (target: string) => void,
 *   removeDirectory: (target: string) => void,
 *   copyFile: (source: string, destination: string) => void,
 *   readDirEntries: (dir: string) => unknown[],
 * }} Filesystem adapter helpers.
 */
export function createFsAdapters(fsModule) {
  return {
    directoryExists: target => fsModule.existsSync(target),
    createDirectory: target => fsModule.mkdirSync(target, { recursive: true }),
    removeDirectory: target =>
      fsModule.rmSync(target, { recursive: true, force: true }),
    copyFile: (source, destination) =>
      fsModule.copyFileSync(source, destination),
    readDirEntries: dir => fsModule.readdirSync(dir, { withFileTypes: true }),
  };
}

/**
 * Async filesystem helpers that swallow missing directories.
 * @param {{
 *   readdir: (dir: string, options?: { withFileTypes?: boolean }) => Promise<unknown[]>,
 *   mkdir: (target: string, options?: { recursive?: boolean }) => Promise<unknown>,
 *   copyFile: (source: string, destination: string) => Promise<void>,
 *   utimes?: (target: string, atime: Date, mtime: Date) => Promise<void>,
 *   readFile: (filePath: string, encoding: 'utf8') => Promise<string>,
 *   writeFile: (filePath: string, content: string) => Promise<void>,
 * }} fsPromisesModule Promise-based filesystem dependency bundle.
 * @returns {{
 *   readDirEntries: (dir: string) => Promise<import('fs').Dirent[]>,
 *   ensureDirectory: (target: string) => Promise<void>,
 *   copyFile: (source: string, destination: string) => Promise<void>,
 *   setCopiedFileTimestamp: (target: string) => Promise<void>,
 *   readFile: (filePath: string, encoding: 'utf8') => Promise<string>,
 *   writeFile: (filePath: string, content: string) => Promise<void>,
 * }} Promise-based filesystem adapter helpers.
 */
export function createAsyncFsAdapters(fsPromisesModule) {
  const typedFsPromisesModule = fsPromisesModule;
  return {
    async readDirEntries(dir) {
      try {
        return /** @type {import('fs').Dirent[]} */ (
          await typedFsPromisesModule.readdir(dir, { withFileTypes: true })
        );
      } catch (error) {
        if (error?.code === 'ENOENT') {
          return [];
        }
        throw error;
      }
    },
    async ensureDirectory(target) {
      await typedFsPromisesModule.mkdir(target, { recursive: true });
    },
    async copyFile(source, destination) {
      await typedFsPromisesModule.copyFile(source, destination);
    },
    ['setCopiedFileTimestamp']: target =>
      writeStableFileTimestamp(typedFsPromisesModule, target),
    async readFile(filePath, encoding) {
      return /** @type {Promise<string>} */ (
        typedFsPromisesModule.readFile(filePath, encoding)
      );
    },
    async writeFile(filePath, content) {
      await typedFsPromisesModule.writeFile(filePath, content);
    },
  };
}

/**
 * Repository quality checks run by the aggregate check script.
 * @type {{ name: string, command: string, args: string[] }[]}
 */
export const CHECK_COMMANDS = [
  { name: 'test', command: 'npm', args: ['test'] },
  { name: 'manuals:check', command: 'npm', args: ['run', 'manuals:check'] },
  { name: 'lint', command: 'npm', args: ['run', 'lint'] },
  { name: 'depcruise', command: 'npm', args: ['run', 'depcruise'] },
  { name: 'core-parse', command: 'npm', args: ['run', 'core-parse'] },
  { name: 'duplication', command: 'npm', args: ['run', 'duplication'] },
  {
    name: 'entrypoint-pattern',
    command: 'npm',
    args: ['run', 'entrypoint-pattern'],
  },
  { name: 'non-core-thin', command: 'npm', args: ['run', 'non-core-thin'] },
  {
    name: 'overexposed-exports',
    command: 'npm',
    args: ['run', 'overexposed-exports'],
  },
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
 *   runSuite: (options: { failFast: boolean, skipTests: boolean }) => Promise<{ exitCode: number }>,
 *   setExitCode: (exitCode: number) => void,
 * }} deps Command dependencies.
 * @returns {() => Promise<void>} Handler that runs the aggregate check.
 */
export function createRunCheckHandle({ argv, runSuite, setExitCode }) {
  return async () => {
    const failFast = argv.includes('--fail-fast');
    const skipTests = argv.includes('--skip-tests');
    const result = await runSuite({ failFast, skipTests });
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
 * @typedef {object} CheckChild
 * @property {{ on: (event: string, handler: (...args: unknown[]) => void) => unknown, setEncoding?: (encoding: string) => void } | null | undefined} stdout Child stdout stream.
 * @property {{ on: (event: string, handler: (...args: unknown[]) => void) => unknown, setEncoding?: (encoding: string) => void } | null | undefined} stderr Child stderr stream.
 * @property {(event: 'error' | 'close', handler: (...args: never[]) => unknown) => unknown} on Child event listener registration.
 * @property {(signal?: string) => boolean} [kill] Optional child termination function.
 */

/** @typedef {(command: string, args: string[], options: { stdio: ['ignore', 'pipe', 'pipe'] }) => CheckChild} CheckSpawn */

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
 * Create a check-suite runner using injected platform defaults.
 * @param {{
 *   defaultSpawn: CheckSpawn,
 *   defaultStdout: { write: (text: string) => void },
 *   defaultStderr: { write: (text: string) => void },
 *   defaultNow: () => number,
 *   defaultTimeoutMs?: number,
 * }} defaults Default platform dependencies.
 * @returns {(options?: {
 *   commands?: CheckCommand[],
 *   failFast?: boolean,
 *   spawnImpl?: CheckSpawn,
 *   stdout?: { write: (text: string) => void },
 *   stderr?: { write: (text: string) => void },
 *   now?: () => number,
 * }) => Promise<{ exitCode: number, failures: CheckFailure[] }>} Runner function.
 */
export function createRunCheckSuite(defaults) {
  return async function runCheckSuite(options) {
    const { commands, failFast, spawnImpl, stdout, stderr, now } =
      resolveRunCheckOptions(options, defaults);

    /** @type {CheckFailure[]} */
    const failures = [];
    /** @type {Map<string, CheckChild>} */
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
          const timeoutMs = defaults.defaultTimeoutMs ?? 30 * 60 * 1000;
          /** @type {CheckChild} */
          let child;
          const state = {
            settled: false,
            /** @type {ReturnType<typeof globalThis.setTimeout> | null} */
            timeoutId: null,
          };

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
            state.settled = true;
            if (state.timeoutId !== null) {
              clearTimeout(state.timeoutId);
              state.timeoutId = null;
            }
            failures.push(failure);
            emitFailureEvent(stderr, command.name, failure);

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
            emitFailureEvent(stderr, command.name, failure);

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
          state.timeoutId = setTimeout(() => {
            if (state.settled) {
              return;
            }

            const failure = {
              name: command.name,
              command: renderCommand(command),
              exitCode: null,
              signal: 'SIGTERM',
              durationMs: Math.max(0, now() - startedAt),
              error: `Check timed out after ${timeoutMs}ms`,
            };

            if (child && typeof child.kill === 'function') {
              child.kill('SIGTERM');
            }

            finishWithFailure(failure, true);
          }, timeoutMs);
          forwardStreamLines(child.stdout, line =>
            stdout.write(`[${command.name}][stdout] ${line}\n`)
          );
          forwardStreamLines(child.stderr, line =>
            stderr.write(`[${command.name}][stderr] ${line}\n`)
          );

          child.on(
            'error',
            /** @param {unknown} error Error raised by the child process. */ error => {
              if (state.settled || (aborted && failFast)) {
                return;
              }

              const failure = buildSpawnFailure(command, startedAt, error, now);
              finishWithFailure(failure, true);
            }
          );

          child.on(
            'close',
            /**
             * @param {number | null} exitCode Exit code reported by the child process.
             * @param {string | null} signal Process signal reported by the child process.
             */ (exitCode, signal) => {
              handleChildClose({
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
                renderCommand,
              });
            }
          );
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
  };
}

/**
 * Resolve runner options with sensible defaults.
 * @param {{
 *   commands?: CheckCommand[],
 *   failFast?: boolean,
 *   spawnImpl?: CheckSpawn,
 *   stdout?: { write: (text: string) => void },
 *   stderr?: { write: (text: string) => void },
 *   now?: () => number,
 * }} [options] Runner configuration.
 * @param {{
 *   defaultSpawn?: CheckSpawn,
 *   defaultStdout?: { write: (text: string) => void },
 *   defaultStderr?: { write: (text: string) => void },
 *   defaultNow?: () => number,
 * }} [defaults] Injected platform defaults.
 * @returns {{
 *   commands: CheckCommand[],
 *   failFast: boolean,
 *   spawnImpl: CheckSpawn,
 *   stdout: { write: (text: string) => void },
 *   stderr: { write: (text: string) => void },
 *   now: () => number,
 * }} Normalized runner options.
 */
export function resolveRunCheckOptions(options = {}, defaults = {}) {
  return {
    commands: resolveCheckCommands(options),
    failFast: resolveFailFast(options),
    spawnImpl: resolveSpawnImpl(options, defaults),
    stdout: resolveOutputStream(
      options.stdout,
      defaults.defaultStdout,
      'stdout'
    ),
    stderr: resolveOutputStream(
      options.stderr,
      defaults.defaultStderr,
      'stderr'
    ),
    now: resolveNow(options, defaults),
  };
}

/**
 * Resolve the command list for a run-check invocation.
 * @param {{ commands?: CheckCommand[] }} options Runner options.
 * @returns {CheckCommand[]} Commands to execute.
 */
function resolveCheckCommands(options) {
  return options.commands ?? CHECK_COMMANDS;
}

/**
 * Resolve whether run-check should stop after the first failure.
 * @param {{ failFast?: boolean }} options Runner options.
 * @returns {boolean} True when the runner should stop after the first failure.
 */
function resolveFailFast(options) {
  return options.failFast ?? false;
}

/**
 * Resolve the child-process spawn implementation.
 * @param {{ spawnImpl?: CheckSpawn }} options Runner options.
 * @param {{ defaultSpawn?: CheckSpawn }} defaults Injected defaults.
 * @returns {CheckSpawn} Spawn implementation.
 */
function resolveSpawnImpl(options, defaults) {
  return /** @type {CheckSpawn} */ (options.spawnImpl ?? defaults.defaultSpawn);
}

/**
 * Resolve a standard output stream for run-check logging.
 * @param {{ write: (text: string) => void } | undefined} stream Explicit stream.
 * @param {{ write: (text: string) => void } | undefined} defaultStream Default stream.
 * @param {'stdout' | 'stderr'} kind Stream kind.
 * @returns {{ write: (text: string) => void }} Output stream.
 */
function resolveOutputStream(stream, defaultStream, kind) {
  return stream ?? defaultStream ?? getDefaultOutputStream(kind);
}

/**
 * Resolve the timestamp provider for run-check timing.
 * @param {{ now?: () => number }} options Runner options.
 * @param {{ defaultNow?: () => number }} defaults Injected defaults.
 * @returns {() => number} Timestamp provider.
 */
function resolveNow(options, defaults) {
  return options.now ?? defaults.defaultNow ?? (() => Date.now());
}

/**
 * Build a structured failure payload for a child process spawn error.
 * @param {CheckCommand} command Command that failed to spawn.
 * @param {number} startedAt Start timestamp.
 * @param {unknown} error Spawn error value.
 * @param {() => number} now Clock helper.
 * @returns {CheckFailure} Structured spawn failure.
 */
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

/**
 * Emit a structured failure event for a specific check.
 * @param {{ write: (text: string) => void }} writer Output writer.
 * @param {string} name Check label.
 * @param {CheckFailure} failure Failure details to report.
 * @returns {void}
 */
function emitFailureEvent(writer, name, failure) {
  emitEvent(writer, {
    type: 'check-failure',
    name,
    command: failure.command,
    exitCode: failure.exitCode,
    signal: failure.signal,
    durationMs: failure.durationMs,
    error: failure.error,
  });
}

/**
 * Resolve a default writable stream when running in Node.
 * @param {'stdout' | 'stderr'} streamName Stream name to use when available.
 * @returns {{ write: (text: string) => void }} Writable stream-like object.
 */
/**
 * Internal check-runner seams used to exercise lifecycle edge cases in tests.
 * @type {{ handleChildClose: (...args: never[]) => unknown, runEntriesInParallel: (...args: never[]) => unknown, shouldIgnoreClosedChild: (...args: never[]) => unknown, abortRemainingChildren: (...args: never[]) => unknown, forwardStreamLines: (...args: never[]) => unknown, writeStableFileTimestamp: (...args: never[]) => unknown }}
 */
export const commonCoreTestUtils = {
  handleChildClose,
  runEntriesInParallel,
  shouldIgnoreClosedChild,
  writeStableFileTimestamp,
  abortRemainingChildren,
  forwardStreamLines,
};
import {
  arrayOrEmpty,
  assertFunction,
  ensureString,
  firstStringOrNull,
  functionOrFallback,
  getRecordOrNull,
  getStringCandidate,
  didExecutionFail,
  isFiniteNumericValue,
  isNotArrayValue,
  isNotStringValue,
  isNonEmptyString,
  isNullish,
  isValidString,
  isNonNullObject,
  isMissingFileError,
  normalizeNonStringValue,
  parseJsonOrNull,
  normalizeMaybeNumber,
  requirePathModule,
  reportFailuresAndExit,
  resolveWhenFallback,
  trimmedStringOrEmpty,
  whenTruthy,
  whenType,
  objectOrEmpty,
} from './browser/validation.js';
import {
  abortRemainingChildren,
  buildSpawnFailure,
  forwardStreamLines,
  getDefaultOutputStream,
  handleChildClose,
  runEntriesInParallel,
  shouldIgnoreClosedChild,
  writeStableFileTimestamp,
} from './build/process-utils.js';

// Stryker restore all

export {
  arrayOrEmpty,
  assertFunction,
  getRecordOrNull,
  didExecutionFail,
  ensureString,
  firstStringOrNull,
  functionOrFallback,
  getStringCandidate,
  isFiniteNumericValue,
  isNotArrayValue,
  isNotStringValue,
  isNonEmptyString,
  isNullish,
  isValidString,
  isNonNullObject,
  isMissingFileError,
  normalizeNonStringValue,
  objectOrEmpty,
  parseJsonOrNull,
  normalizeMaybeNumber,
  requirePathModule,
  reportFailuresAndExit,
  resolveWhenFallback,
  trimmedStringOrEmpty,
  whenTruthy,
  whenType,
};
export {
  abortRemainingChildren,
  buildSpawnFailure,
  forwardStreamLines,
  getDefaultOutputStream,
  handleChildClose,
  runEntriesInParallel,
  shouldIgnoreClosedChild,
} from './build/process-utils.js';
