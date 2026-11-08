/** @typedef {{cwd: string, encoding: 'utf8', timeout: number, maxBuffer: number, stdio?: 'inherit', env?: Record<string, string | undefined>}} ImpactCommandOptions */

export const JEST_RUNNER = 'scripts/run-jest.js';

/**
 * Quote one path for a human-readable POSIX command preview.
 * Execution uses argument arrays and never evaluates this string in a shell.
 * @param {string} value Path to quote.
 * @returns {string} Single-quoted shell token.
 */
export function quotePath(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

/**
 * Build bounded process options for Git and Jest discovery/execution.
 * @param {string} rootDir Working directory.
 * @param {number} timeoutMs Process timeout.
 * @param {boolean} [streamOutput] Whether to inherit child output streams.
 * @returns {ImpactCommandOptions} Child process options.
 */
export function commandOptions(rootDir, timeoutMs, streamOutput = false) {
  /** @type {ImpactCommandOptions} */
  const options = {
    cwd: rootDir,
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 16 * 1024 * 1024,
  };
  if (streamOutput) options.stdio = 'inherit';
  return options;
}

/**
 * Build a Jest command whose coverage scope is limited to changed logic files.
 * @param {{paths: {rootDir: string, pathModule: {join: (first: string, ...rest: string[]) => string}}, coverageDirectory: string, selection: {tests: string[], sourceFiles: string[]}, environment: Record<string, string | undefined>}} options Command inputs.
 * @returns {{args: string[], command: string, options: ImpactCommandOptions}} Executable arguments and a reproduction command.
 */
export function createScopedCoverageCommand({
  paths,
  coverageDirectory,
  selection,
  environment,
}) {
  const { rootDir, pathModule } = paths;
  const { tests, sourceFiles } = selection;
  const threshold = JSON.stringify({
    global: { branches: 0, functions: 0, lines: 0, statements: 0 },
  });
  const args = [
    pathModule.join(rootDir, JEST_RUNNER),
    '--runInBand',
    '--coverage',
    '--coverageReporters=json',
    `--coverageThreshold=${threshold}`,
    '--coverageDirectory',
    coverageDirectory,
    ...sourceFiles.map(file => `--collectCoverageFrom=${file}`),
    '--runTestsByPath',
    ...tests,
  ];
  const displayArgs = [
    'node',
    JEST_RUNNER,
    ...args
      .slice(1)
      .map(argument =>
        argument === coverageDirectory ? '<temporary-coverage-dir>' : argument
      ),
  ];
  const options = commandOptions(rootDir, 120 * 60 * 1000, true);
  options.env = { ...environment, DADETO_COVERAGE_SHARD: '1' };
  return { args, command: displayArgs.map(quotePath).join(' '), options };
}
