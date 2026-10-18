import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { tmpdir } from 'node:os';
import {
  createPlanCheckImpactHandle,
  createRunCheckImpactHandle,
  createRunScopedCheckImpactHandle,
} from '../core/local/checkImpactPlan.js';
import { bindStartupEffectBoundary } from './allow-effects.js';

const rootDir = fileURLToPath(new URL('../..', import.meta.url));
const defaultBaseRef =
  process.env.DADETO_CHECK_BASE ??
  (process.env.GITHUB_BASE_REF && `origin/${process.env.GITHUB_BASE_REF}`);
const JEST_RUNNER = 'scripts/run-jest.js';
const runCommand = (_permission, command, args, options) =>
  spawnSync(command, args, options);

/**
 * Bind the shared effect adapters for impact planning and execution CLIs.
 * @param {string[]} argv Command-line arguments.
 * @returns {object} Runtime dependencies for an impact handler.
 */
export function createCheckImpactCommandDependencies(argv) {
  return {
    argv,
    rootDir,
    processExecPath: process.execPath,
    defaultBaseRef,
    impactShardSize: Number(process.env.DADETO_CHECK_IMPACT_SHARD_SIZE ?? 200),
    fileExists: filePath => existsSync(filePath),
    pathModule: path,
    bindStartupEffectBoundary,
    runCommand,
    runCoverage: (permission, tests, sourceFiles) =>
      runScopedCoverage(permission, tests, sourceFiles, runCommand),
    writeOutput: (_permission, output) => process.stdout.write(output),
  };
}

/**
 * Run selected unit tests with coverage restricted to changed core files.
 * @param {import('../../types/allow-effects').AllowEffects} permission Effect permission.
 * @param {string[]} tests Selected test paths.
 * @param {string[]} sourceFiles Changed core source paths.
 * @param {(permission: import('../../types/allow-effects').AllowEffects, command: string, args: string[], options: object) => {status: number | null, stdout?: string, stderr?: string, error?: Error}} runCommand Permission-aware process runner.
 * @returns {{status: number | null, stdout?: string, stderr?: string, error?: Error, coverage?: object, command: string, coverageError?: string}} Coverage execution result.
 */
function runScopedCoverage(permission, tests, sourceFiles, runCommand) {
  const coverageDirectory = mkdtempSync(
    path.join(tmpdir(), 'dadeto-impact-coverage-')
  );
  const threshold = JSON.stringify({
    global: { branches: 0, functions: 0, lines: 0, statements: 0 },
  });
  const jestArgs = [
    path.join(rootDir, JEST_RUNNER),
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
  const reproductionArgs = [
    'node',
    JEST_RUNNER,
    ...jestArgs
      .slice(1)
      .map(argument =>
        argument === coverageDirectory ? '<temporary-coverage-dir>' : argument
      ),
  ];
  const command = reproductionArgs.map(quoteShellArgument).join(' ');
  let execution;
  let coverage;
  let coverageError;
  try {
    execution = runCommand(permission, process.execPath, jestArgs, {
      cwd: rootDir,
      encoding: 'utf8',
      timeout: 120 * 60 * 1000,
      maxBuffer: 16 * 1024 * 1024,
      stdio: 'inherit',
      env: { ...process.env, DADETO_COVERAGE_SHARD: '1' },
    });
    try {
      coverage = JSON.parse(
        readFileSync(
          path.join(coverageDirectory, 'coverage-final.json'),
          'utf8'
        )
      );
    } catch (error) {
      coverageError = `Could not read scoped coverage output: ${error instanceof Error ? error.message : String(error)}`;
    }
  } finally {
    rmSync(coverageDirectory, { recursive: true, force: true });
  }
  return {
    ...execution,
    coverage,
    command,
    ...(coverageError ? { coverageError } : {}),
  };
}

/**
 * Quote a token for the human-readable scoped coverage reproduction command.
 * @param {string} value Command token.
 * @returns {string} Safely single-quoted POSIX shell token.
 */
function quoteShellArgument(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

/**
 * Execute one impact CLI mode and assign its exit status.
 * @param {'plan' | 'run' | 'checks'} mode Selected CLI mode.
 * @param {string[]} argv Command-line arguments.
 * @returns {void}
 */
export function runCheckImpactCommand(mode, argv) {
  const createHandle = {
    plan: createPlanCheckImpactHandle,
    run: createRunCheckImpactHandle,
    checks: createRunScopedCheckImpactHandle,
  }[mode];
  const handle = createHandle(createCheckImpactCommandDependencies(argv));
  process.exitCode = handle().exitCode;
}
