import { jest } from '@jest/globals';
import path from 'node:path';
import {
  createPlanCheckImpactHandle,
  createRunCheckImpactHandle,
  createRunScopedCheckImpactHandle,
} from '../../src/core/local/checkImpactPlan.js';

/**
 * Create a capture for impact-runner output.
 * @returns {{chunks: string[], write: (value: string) => void, report: () => object}} Output capture.
 */
function captureOutput() {
  const chunks = [];
  return {
    chunks,
    write(value) {
      chunks.push(value);
    },
    report() {
      return JSON.parse(chunks.filter(value => value.startsWith('{')).at(-1));
    },
  };
}

/**
 * Run an impact handler with controlled process effects.
 * @param {object} root0 Test configuration.
 * @param {typeof createPlanCheckImpactHandle | typeof createRunCheckImpactHandle | typeof createRunScopedCheckImpactHandle} [root0.createHandle] Handler factory.
 * @param {string[]} [root0.argv] CLI arguments.
 * @param {(command: string, args: string[], options: object) => {status: number | null, stdout?: string, stderr?: string, error?: Error}} [root0.runImpl] Process result stub.
 * @param {string} [root0.defaultBaseRef] Optional Git comparison base.
 * @param {number} [root0.impactShardSize] Maximum test files per shard.
 * @param {(absolutePath: string) => boolean} [root0.fileExists] Worktree existence stub.
 * @param {(tests: string[], sourceFiles: string[]) => object} [root0.coverageImpl] Coverage result stub.
 * @returns {{result: {exitCode: number}, output: ReturnType<typeof captureOutput>, permission: object, runCommand: jest.Mock, runCoverage: jest.Mock, writeOutput: jest.Mock}} Handler result and captured effects.
 */
function runHandle({
  createHandle = createRunCheckImpactHandle,
  argv = [],
  runImpl = () => ({ status: 0, stdout: '' }),
  defaultBaseRef,
  impactShardSize,
  fileExists,
  coverageImpl = (_tests, sourceFiles) => ({
    status: 0,
    coverage: Object.fromEntries(
      sourceFiles.map(sourceFile => [
        path.resolve(sourceFile),
        { statementMap: {}, s: {}, branchMap: {}, b: {} },
      ])
    ),
  }),
} = {}) {
  const permission = {};
  const output = captureOutput();
  const runCommand = jest.fn((receivedPermission, command, args, options) => {
    expect(receivedPermission).toBe(permission);
    return runImpl(command, args, options);
  });
  const writeOutput = jest.fn((receivedPermission, value) => {
    expect(receivedPermission).toBe(permission);
    output.write(value);
  });
  const runCoverage = jest.fn((receivedPermission, tests, sourceFiles) => {
    expect(receivedPermission).toBe(permission);
    return coverageImpl(tests, sourceFiles);
  });
  const handle = createHandle({
    argv,
    rootDir: process.cwd(),
    processExecPath: process.execPath,
    defaultBaseRef,
    impactShardSize,
    fileExists,
    pathModule: path,
    bindStartupEffectBoundary: callback => callback(permission),
    runCommand,
    runCoverage,
    writeOutput,
  });
  return {
    result: handle(),
    output,
    permission,
    runCommand,
    runCoverage,
    writeOutput,
  };
}

/**
 * Return the Jest command arguments from a recorded process call.
 * @param {[string, string, string[], object]} call Recorded process call.
 * @returns {string[]} Arguments after the executable path.
 */
function runnerArgs(call) {
  return call[2].slice(1);
}

describe('impact planner', () => {
  it('prints an explicit test plan without running Jest', () => {
    const { result, output, runCommand } = runHandle({
      createHandle: createPlanCheckImpactHandle,
      argv: ['--files', 'test/core/example.test.js'],
    });

    expect(result).toEqual({ exitCode: 0 });
    expect(runCommand).not.toHaveBeenCalled();
    expect(output.report()).toMatchObject({
      mode: 'selected',
      tests: ['test/core/example.test.js'],
      authoritative: 'npm run check:full',
    });
  });
});

describe('test impact runner', () => {
  it('runs a changed test directly with no coverage runner or shell', () => {
    const { result, output, runCommand, runCoverage } = runHandle({
      argv: ['--files', "test/core/it's-a-test.test.js"],
    });

    expect(result).toEqual({ exitCode: 0 });
    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(runCoverage).not.toHaveBeenCalled();
    const call = runCommand.mock.calls[0];
    expect(call[1]).toBe(process.execPath);
    expect(call[2][0]).toMatch(/scripts\/run-jest\.js$/);
    expect(runnerArgs(call)).toEqual([
      '--runInBand',
      '--runTestsByPath',
      "test/core/it's-a-test.test.js",
    ]);
    expect(JSON.stringify(call)).not.toMatch(
      /run-jest-with-coverage|--coverage/
    );
    expect(output.report()).toMatchObject({
      changedPaths: ["test/core/it's-a-test.test.js"],
      selectedTests: ["test/core/it's-a-test.test.js"],
      result: 'passed',
      exitStatus: 0,
    });
  });

  it('discovers and runs related tests for changed source', () => {
    const calls = [];
    const { result, runCommand, runCoverage, output } = runHandle({
      argv: ['--files', 'src/core/example.js'],
      runImpl: (command, args, options) => {
        calls.push({ command, args, options });
        return calls.length === 1
          ? {
              status: 0,
              stdout: `${process.cwd()}/test/core/related.test.js\n`,
            }
          : { status: 0, stdout: 'tests passed\n' };
      },
    });

    expect(result).toEqual({ exitCode: 0 });
    expect(runCommand).toHaveBeenCalledTimes(2);
    expect(runCoverage).not.toHaveBeenCalled();
    expect(calls[0].args).toEqual([
      expect.stringMatching(/scripts\/run-jest\.js$/),
      '--runInBand',
      '--listTests',
      '--findRelatedTests',
      'src/core/example.js',
    ]);
    expect(calls[0].options).toMatchObject({ timeout: 45_000 });
    expect(calls[1].args.slice(1)).toEqual([
      '--runInBand',
      '--runTestsByPath',
      'test/core/related.test.js',
    ]);
    expect(output.report()).toMatchObject({
      selectedTests: ['test/core/related.test.js'],
      testSelection: 'related',
      exitStatus: 0,
    });
  });

  it('includes staged, unstaged, and untracked paths and deduplicates them', () => {
    const calls = [];
    const { result, output } = runHandle({
      runImpl: (command, args) => {
        calls.push({ command, args });
        if (
          command === 'git' &&
          args[0] === 'diff' &&
          !args.includes('--cached')
        )
          return {
            status: 0,
            stdout: 'src/core/unstaged.js\0test/core/shared.test.js\0',
          };
        if (command === 'git' && args.includes('--cached'))
          return {
            status: 0,
            stdout: 'test/core/staged.test.js\0test/core/shared.test.js\0',
          };
        if (command === 'git' && args[0] === 'ls-files')
          return { status: 0, stdout: 'src/core/untracked.js\0' };
        if (args.includes('--findRelatedTests'))
          return { status: 0, stdout: 'test/core/related.test.js\n' };
        return { status: 0, stdout: '' };
      },
    });

    expect(result).toEqual({ exitCode: 0 });
    expect(calls.slice(0, 3).map(call => call.args[0])).toEqual([
      'diff',
      'diff',
      'ls-files',
    ]);
    expect(calls[0].args).not.toContain('--cached');
    expect(calls[1].args).toContain('--cached');
    expect(output.report()).toMatchObject({
      changedPaths: [
        'src/core/unstaged.js',
        'src/core/untracked.js',
        'test/core/shared.test.js',
        'test/core/staged.test.js',
      ].sort(),
      selectedTests: [
        'test/core/related.test.js',
        'test/core/shared.test.js',
        'test/core/staged.test.js',
      ],
    });
  });

  it('adds changes relative to the selected base ref', () => {
    const calls = [];
    const { result, runCommand, output } = runHandle({
      argv: ['--base', 'origin/main'],
      runImpl: (command, args, options) => {
        calls.push({ command, args, options });
        if (
          command === 'git' &&
          args[0] === 'diff' &&
          args.includes('--cached')
        )
          return { status: 0, stdout: '' };
        if (command === 'git' && args[0] === 'ls-files')
          return { status: 0, stdout: '' };
        if (command === 'git' && args[0] === 'rev-parse')
          return { status: 0, stdout: 'abcdef123456\n' };
        if (command === 'git' && args.some(arg => arg.includes('...HEAD')))
          return { status: 0, stdout: 'test/core/from-base.test.js\0' };
        return { status: 0, stdout: '' };
      },
    });

    expect(result).toEqual({ exitCode: 0 });
    expect(runCommand).toHaveBeenCalled();
    expect(calls.some(call => call.args.includes('origin/main^{commit}'))).toBe(
      true
    );
    expect(calls.some(call => call.args.includes('abcdef123456...HEAD'))).toBe(
      true
    );
    expect(output.report()).toMatchObject({
      changedPaths: ['test/core/from-base.test.js'],
      selectedTests: ['test/core/from-base.test.js'],
    });
  });
});

describe('test impact runner selection fallbacks', () => {
  it('falls back to all unit tests after selector failure or no related tests', () => {
    for (const selectorResult of [
      { status: 1, stdout: '', error: new Error('selector failed') },
      { status: 0, stdout: '' },
    ]) {
      const calls = [];
      const { result, output } = runHandle({
        argv: ['--files', 'src/core/example.js'],
        runImpl: (command, args) => {
          calls.push(args);
          if (calls.length === 1) return selectorResult;
          if (command === 'git' && args.includes('--exclude-standard')) {
            return {
              status: 0,
              stdout: 'test/core/fallback.test.js\0test/e2e/ignored.test.js\0',
            };
          }
          return { status: 0, stdout: '' };
        },
      });

      expect(result).toEqual({ exitCode: 0 });
      expect(calls[1]).toEqual(['ls-files', '-co', '--exclude-standard', '-z']);
      expect(calls[2].slice(1)).toEqual([
        '--runInBand',
        '--runTestsByPath',
        'test/core/fallback.test.js',
      ]);
      expect(output.report()).toMatchObject({
        testSelection: 'all-unit',
        selectedTests: ['test/core/fallback.test.js'],
        fallbackReason: expect.any(String),
        result: 'passed',
      });
    }
  });

  it('falls back for unsupported, unsafe, and malformed inputs', () => {
    for (const argv of [
      ['--files', 'docs/guide.md'],
      ['--files', '../outside.test.js'],
      ['--unsupported'],
    ]) {
      const calls = [];
      const { result, output } = runHandle({
        argv,
        runImpl: (command, args) => {
          calls.push(args);
          if (command === 'git' && args.includes('--exclude-standard')) {
            return {
              status: 0,
              stdout: 'test/core/fallback.test.js\0',
            };
          }
          return { status: 0, stdout: '' };
        },
      });
      expect(result).toEqual({ exitCode: 0 });
      expect(calls.some(args => args.includes('--findRelatedTests'))).toBe(
        false
      );
      expect(calls.at(-1).slice(1)).toEqual([
        '--runInBand',
        '--runTestsByPath',
        'test/core/fallback.test.js',
      ]);
      expect(output.report()).toMatchObject({
        testSelection: 'all-unit',
        selectedTests: ['test/core/fallback.test.js'],
      });
    }
  });

  it('does not run tests for a clean tree and explains the empty selection', () => {
    const calls = [];
    const { result, output } = runHandle({
      runImpl: (command, args) => {
        calls.push({ command, args });
        return { status: 0, stdout: '' };
      },
    });

    expect(result).toEqual({ exitCode: 0 });
    expect(calls).toHaveLength(3);
    expect(output.report()).toMatchObject({
      changedPaths: [],
      selectedTests: [],
      testSelection: 'none',
      result: 'skipped',
      exitStatus: 0,
    });
  });

  it('runs every unit test without coverage if Git cannot inspect changes', () => {
    const calls = [];
    const { result, output } = runHandle({
      runImpl: (command, args) => {
        calls.push({ command, args });
        if (command === 'git' && args[0] === 'diff')
          return { status: 128, stdout: '' };
        if (command === 'git' && args.includes('--exclude-standard')) {
          return {
            status: 0,
            stdout: 'test/core/fallback.test.js\0',
          };
        }
        return { status: 0, stdout: '' };
      },
    });

    expect(result).toEqual({ exitCode: 0 });
    expect(calls.at(-1).args.slice(1)).toEqual([
      '--runInBand',
      '--runTestsByPath',
      'test/core/fallback.test.js',
    ]);
    expect(output.report()).toMatchObject({
      testSelection: 'all-unit',
      fallbackReason: expect.stringContaining('Git could not inspect'),
    });
  });

  it('returns a failing exit status when selected tests fail', () => {
    const { result, output } = runHandle({
      argv: ['--files', 'test/core/failing.test.js'],
      runImpl: () => ({ status: 1, stdout: 'failed\n' }),
    });

    expect(result).toEqual({ exitCode: 1 });
    expect(output.report()).toMatchObject({ result: 'failed', exitStatus: 1 });
  });
});

describe('scoped static-check impact executor', () => {
  it('runs changed-file ESLint and core-parse before selected unit tests', () => {
    const calls = [];
    const { result, output, runCoverage, permission } = runHandle({
      createHandle: createRunScopedCheckImpactHandle,
      argv: ['--files', 'src/core/example.js'],
      runImpl: (command, args, options) => {
        calls.push({ command, args, options });
        if (args.includes('--findRelatedTests'))
          return { status: 0, stdout: 'test/core/related.test.js\n' };
        if (args.some(arg => arg.endsWith('/eslint.js')))
          return { status: 0, stdout: 'lint passed\n' };
        if (command === 'npm')
          return { status: 0, stdout: 'core parse passed\n' };
        return { status: 0, stdout: 'tests passed\n' };
      },
    });

    expect(result).toEqual({ exitCode: 0 });
    expect(calls).toHaveLength(4);
    expect(calls[1]).toMatchObject({
      command: process.execPath,
      args: [
        expect.stringMatching(/node_modules\/eslint\/bin\/eslint\.js$/),
        '--max-warnings=0',
        '--no-cache',
        '--no-color',
        'src/core/example.js',
      ],
    });
    expect(calls[2]).toMatchObject({
      command: 'npm',
      args: ['run', 'core-parse'],
      options: { stdio: 'inherit' },
    });
    expect(calls[3]).toMatchObject({
      command: 'npm',
      args: ['run', 'duplication'],
      options: { stdio: 'inherit' },
    });
    expect(runCoverage).toHaveBeenCalledWith(
      permission,
      ['test/core/related.test.js'],
      ['src/core/example.js']
    );
    expect(calls[1].options).toMatchObject({ stdio: 'inherit' });
    expect(output.report()).toMatchObject({
      result: 'passed',
      staticChecks: [
        { name: 'eslint', result: 'passed', exitStatus: 0 },
        { name: 'core-parse', result: 'passed', exitStatus: 0 },
        { name: 'duplication', result: 'passed', exitStatus: 0 },
      ],
    });
    expect(output.chunks).toContain('Impact checks: starting eslint.\n');
    expect(output.chunks).toContain(
      'Impact checks: core-parse passed (exit 0).\n'
    );
    expect(output.chunks).toContain(
      'Impact checks: duplication passed (exit 0).\n'
    );
  });

  it('does not run the core duplication scan for non-core source changes', () => {
    const calls = [];
    const { result } = runHandle({
      createHandle: createRunScopedCheckImpactHandle,
      argv: ['--files', 'src/browser/example.js'],
      runImpl: (command, args, options) => {
        calls.push({ command, args, options });
        if (args.includes('--findRelatedTests'))
          return { status: 0, stdout: 'test/browser/related.test.js\n' };
        return { status: 0, stdout: '' };
      },
    });

    expect(result).toEqual({ exitCode: 0 });
    expect(calls).toHaveLength(3);
    expect(
      calls.some(
        call => call.command === 'npm' && call.args[1] === 'duplication'
      )
    ).toBe(false);
  });

  it('reports only uncovered locations in changed core files for scoped coverage', () => {
    const changedFile = path.resolve('src/core/example.js');
    const unrelatedFile = path.resolve('src/core/unrelated.js');
    let shard = 0;
    const { result, output, runCoverage } = runHandle({
      createHandle: createRunScopedCheckImpactHandle,
      argv: ['--files', 'src/core/example.js', 'src/browser/example.js'],
      impactShardSize: 1,
      coverageImpl: (tests, sourceFiles) => {
        expect(sourceFiles).toEqual(['src/core/example.js']);
        expect(tests).toEqual([`test/core/related-${shard + 1}.test.js`]);
        shard += 1;
        if (shard === 1)
          return {
            status: 0,
            command: "node 'scripts/run-jest.js' '--coverage'",
            coverage: {
              [changedFile]: {
                statementMap: {
                  0: { start: { line: 10 } },
                  1: { start: { line: 20 } },
                  2: { start: { line: 30 } },
                  99: { start: { line: 'unknown' } },
                },
                s: { 0: 1 },
                branchMap: {
                  0: {
                    line: 22,
                    locations: [
                      { start: { line: 22 } },
                      { start: { line: 23 } },
                    ],
                  },
                  1: { line: 24 },
                },
              },
              [unrelatedFile]: {
                statementMap: { 0: { start: { line: 1 } } },
                s: { 0: 0 },
                branchMap: {},
                b: {},
              },
            },
          };
        if (shard === 2)
          return {
            status: 0,
            coverage: {
              'src/core/example.js': {
                statementMap: {},
                s: { 1: 0, 2: 0, 99: 0 },
                f: { 0: 0, 1: 0 },
                branchMap: {},
                b: { 0: [1, 0], 1: [1, 0], 2: [0] },
              },
            },
          };
        return {
          status: 0,
          coverage: {
            'src/core/example.js': { s: {}, statementMap: {}, branchMap: {} },
          },
          coverageError: 'One shard could not finish its report.',
        };
      },
      runImpl: (command, args) =>
        args.includes('--findRelatedTests')
          ? {
              status: 0,
              stdout:
                'test/core/related-1.test.js\ntest/core/related-2.test.js\ntest/core/related-3.test.js\n',
            }
          : { status: 0, stdout: '' },
    });

    expect(result).toEqual({ exitCode: 1 });
    expect(runCoverage).toHaveBeenCalledTimes(3);
    expect(output.report()).toMatchObject({
      result: 'failed',
      exitStatus: 1,
      scopedCoverage: {
        scope: 'changed-core-files',
        files: [
          {
            file: 'src/core/example.js',
            collected: true,
            uncoveredLines: [20, 30],
            uncoveredBranches: [
              { line: 23, arm: 2 },
              { line: 24, arm: 2 },
            ],
          },
        ],
        commands: [expect.stringContaining('--coverage')],
        errors: ['One shard could not finish its report.'],
        authoritative: 'npm run check:full',
      },
    });
  });

  it('fails when scoped coverage finds an uncovered branch arm', () => {
    const changedFile = path.resolve('src/core/example.js');
    const { result, output } = runHandle({
      createHandle: createRunScopedCheckImpactHandle,
      argv: ['--files', 'src/core/example.js'],
      coverageImpl: () => ({
        status: 0,
        coverage: {
          [changedFile]: {
            statementMap: {},
            branchMap: {
              0: {
                line: 42,
                locations: [{ start: { line: 42 } }, { start: { line: 43 } }],
              },
            },
            s: {},
            b: { 0: [1, 0] },
          },
        },
      }),
      runImpl: (_command, args) =>
        args.includes('--findRelatedTests')
          ? { status: 0, stdout: 'test/core/related.test.js\n' }
          : { status: 0, stdout: '' },
    });

    expect(result).toEqual({ exitCode: 1 });
    expect(output.report()).toMatchObject({
      result: 'failed',
      exitStatus: 1,
      scopedCoverage: {
        files: [
          {
            file: 'src/core/example.js',
            collected: true,
            uncoveredLines: [],
            uncoveredBranches: [{ line: 43, arm: 2 }],
          },
        ],
      },
    });
  });

  it('marks a changed core file as uncollected when coverage output is missing', () => {
    const { result, output } = runHandle({
      createHandle: createRunScopedCheckImpactHandle,
      argv: ['--files', 'src/core/example.js'],
      coverageImpl: () => ({
        status: 0,
        coverageError: 'Could not read scoped coverage output.',
      }),
      runImpl: (command, args) =>
        args.includes('--findRelatedTests')
          ? { status: 0, stdout: 'test/core/related.test.js\n' }
          : { status: 0, stdout: '' },
    });

    expect(result).toEqual({ exitCode: 1 });
    expect(output.report()).toMatchObject({
      result: 'failed',
      exitStatus: 1,
      scopedCoverage: {
        files: [
          {
            file: 'src/core/example.js',
            collected: false,
            uncoveredLines: [],
            uncoveredBranches: [],
          },
        ],
        commands: [],
        errors: ['Could not read scoped coverage output.'],
      },
    });
  });

  it('handles an empty Istanbul record as a collected file with no locations', () => {
    const changedFile = path.resolve('src/core/example.js');
    const { output } = runHandle({
      createHandle: createRunScopedCheckImpactHandle,
      argv: ['--files', 'src/core/example.js'],
      coverageImpl: () => ({ status: 0, coverage: { [changedFile]: {} } }),
      runImpl: (command, args) =>
        args.includes('--findRelatedTests')
          ? { status: 0, stdout: 'test/core/related.test.js\n' }
          : { status: 0, stdout: '' },
    });

    expect(output.report()).toMatchObject({
      scopedCoverage: {
        files: [
          {
            file: 'src/core/example.js',
            collected: true,
            uncoveredLines: [],
            uncoveredBranches: [],
          },
        ],
        commands: [],
        errors: [],
      },
    });
  });

  it('reports a failed duplication gate and still runs selected tests', () => {
    const calls = [];
    const { result, output, runCoverage } = runHandle({
      createHandle: createRunScopedCheckImpactHandle,
      argv: ['--files', 'src/core/example.js'],
      runImpl: (command, args, options) => {
        calls.push({ command, args, options });
        if (args.includes('--findRelatedTests'))
          return { status: 0, stdout: 'test/core/related.test.js\n' };
        if (args.some(arg => arg.endsWith('/eslint.js')))
          return { status: 0, stdout: 'lint passed\n' };
        if (command === 'npm' && args[1] === 'duplication')
          return { status: 1, stderr: 'Duplication gate found 1 clone.\n' };
        return { status: 0, stdout: 'check passed\n' };
      },
    });

    expect(result).toEqual({ exitCode: 1 });
    expect(runCoverage).toHaveBeenCalledTimes(1);
    expect(output.report()).toMatchObject({
      result: 'failed',
      staticChecks: [
        { name: 'eslint', result: 'passed', exitStatus: 0 },
        { name: 'core-parse', result: 'passed', exitStatus: 0 },
        { name: 'duplication', result: 'failed', exitStatus: 1 },
      ],
    });
    expect(output.chunks).toContain('Duplication gate found 1 clone.\n');
    expect(output.chunks).toContain(
      'Impact checks: duplication failed (exit 1).\n'
    );
  });

  it('reports a failed static gate and still runs selected tests', () => {
    const calls = [];
    const { result, output } = runHandle({
      createHandle: createRunScopedCheckImpactHandle,
      argv: ['--files', 'test/core/changed.test.js'],
      runImpl: (command, args, options) => {
        calls.push({ command, args, options });
        if (args.some(arg => arg.endsWith('/eslint.js')))
          return {
            status: null,
            stderr: 'eslint could not start\n',
            error: new Error('executable unavailable'),
          };
        return { status: 0, stdout: 'tests passed\n' };
      },
    });

    expect(result).toEqual({ exitCode: 1 });
    expect(calls).toHaveLength(2);
    expect(calls[1].args).toContain('--runTestsByPath');
    expect(calls[0].options).toMatchObject({ stdio: 'inherit' });
    expect(calls[1].options).toMatchObject({ stdio: 'inherit' });
    expect(output.report()).toMatchObject({
      result: 'failed',
      exitStatus: 1,
      staticChecks: [
        {
          name: 'eslint',
          result: 'failed',
          exitStatus: 1,
          reason: 'executable unavailable',
        },
      ],
    });
    expect(output.chunks).toContain('eslint could not start\n');
  });

  it('states that static gates were not assessed when test selection falls back', () => {
    const { result, output } = runHandle({
      createHandle: createRunScopedCheckImpactHandle,
      argv: ['--files', 'infra/main.tf'],
      runImpl: (_command, args) => {
        if (args.includes('--exclude-standard'))
          return { status: 0, stdout: 'test/core/fallback.test.js\0' };
        return { status: 0, stdout: 'fallback tests passed\n' };
      },
    });

    expect(result).toEqual({ exitCode: 0 });
    expect(output.report()).toMatchObject({
      testSelection: 'all-unit',
      result: 'passed',
      staticChecks: [
        {
          name: 'static-gates',
          result: 'not-run',
          exitStatus: null,
          reason: expect.stringContaining('Unsupported or unsafe changed path'),
        },
      ],
    });
    expect(
      output.chunks.some(chunk =>
        chunk.includes(
          'Impact static checks: not run because the path selection fell back.'
        )
      )
    ).toBe(true);
  });

  it('keeps scoped coverage disabled for test-only and fallback runs', () => {
    const direct = runHandle({
      createHandle: createRunScopedCheckImpactHandle,
      argv: ['--files', 'test/core/changed.test.js'],
    });
    const fallback = runHandle({
      createHandle: createRunScopedCheckImpactHandle,
      argv: ['--files', 'src/core/example.js', 'infra/main.tf'],
      runImpl: (_command, args) => {
        if (args.includes('--exclude-standard'))
          return { status: 0, stdout: 'test/core/fallback.test.js\0' };
        return { status: 0, stdout: '' };
      },
    });

    expect(direct.runCoverage).not.toHaveBeenCalled();
    expect(fallback.runCoverage).not.toHaveBeenCalled();
    expect(fallback.output.report()).not.toHaveProperty('scopedCoverage');
  });

  it('skips static gates when no changed paths are found', () => {
    const { result, output, runCommand } = runHandle({
      createHandle: createRunScopedCheckImpactHandle,
      runImpl: () => ({ status: 0, stdout: '' }),
    });

    expect(result).toEqual({ exitCode: 0 });
    expect(output.report()).toMatchObject({
      testSelection: 'none',
      result: 'skipped',
      staticChecks: [],
    });
    expect(runCommand).toHaveBeenCalledTimes(3);
  });
});

describe('composed scoped impact diagnostics', () => {
  it('surfaces parse, clone, and uncovered-branch locations in one scoped run', () => {
    const changedFile = 'src/core/changed.js';
    const parseLocation =
      'src/core/changed.js contains parser function parseInput; keep parse logic in boundary modules.\n';
    const cloneLocation =
      'src/core/changed.js:12-18 ↔ src/core/other.js:31-37\n';
    const { result, output, runCommand } = runHandle({
      createHandle: createRunScopedCheckImpactHandle,
      argv: ['--files', changedFile],
      runImpl: (command, args) => {
        if (args.includes('--findRelatedTests'))
          return { status: 0, stdout: 'test/core/related.test.js\n' };
        if (args.some(argument => argument.endsWith('/eslint.js')))
          return { status: 0, stdout: 'lint passed\n' };
        if (args[1] === 'core-parse')
          return { status: 1, stdout: parseLocation };
        if (args[1] === 'duplication')
          return { status: 1, stderr: cloneLocation };
        return { status: 0, stdout: 'tests passed\n' };
      },
      coverageImpl: (_tests, sourceFiles) => ({
        status: 0,
        coverage: Object.fromEntries(
          sourceFiles.map(sourceFile => [
            path.resolve(sourceFile),
            {
              statementMap: { 0: { start: { line: 8 } } },
              s: { 0: 1 },
              branchMap: {
                0: {
                  line: 20,
                  locations: [{ start: { line: 20 } }, { start: { line: 21 } }],
                },
              },
              b: { 0: [1, 0] },
            },
          ])
        ),
      }),
    });

    expect(result).toEqual({ exitCode: 1 });
    expect(
      runCommand.mock.calls.map(([, command, args]) => [command, args])
    ).toEqual(
      expect.arrayContaining([
        ['npm', ['run', 'core-parse']],
        ['npm', ['run', 'duplication']],
      ])
    );
    expect(output.report()).toMatchObject({
      result: 'failed',
      exitStatus: 1,
      staticChecks: [
        { name: 'eslint', result: 'passed', exitStatus: 0 },
        { name: 'core-parse', result: 'failed', exitStatus: 1 },
        { name: 'duplication', result: 'failed', exitStatus: 1 },
      ],
      scopedCoverage: {
        files: [
          {
            file: changedFile,
            uncoveredBranches: [{ line: 21, arm: 2 }],
          },
        ],
      },
    });
    expect(output.chunks).toContain(parseLocation);
    expect(output.chunks).toContain(cloneLocation);
    expect(output.chunks).toContain(
      'Impact checks: core-parse failed (exit 1).\n'
    );
    expect(output.chunks).toContain(
      'Impact checks: duplication failed (exit 1).\n'
    );
  });
});

describe('test impact runner fallback execution', () => {
  it('runs fallback unit tests in bounded no-coverage shards', () => {
    const files = [1, 2, 3, 4, 5].map(index =>
      path.resolve(`test/core/fallback-${index}.test.js`)
    );
    const commands = [];
    const { result, output } = runHandle({
      argv: ['--unsupported'],
      impactShardSize: 2,
      runImpl: (command, args) => {
        commands.push(args);
        if (command === 'git' && args.includes('--exclude-standard')) {
          return {
            status: 0,
            stdout: files
              .map(file => path.relative(process.cwd(), file))
              .join('\0'),
          };
        }
        return { status: 0, stdout: '' };
      },
    });

    const shardCommands = commands.filter(args =>
      args.includes('--runTestsByPath')
    );
    expect(result).toEqual({ exitCode: 0 });
    expect(shardCommands).toHaveLength(3);
    expect(
      shardCommands.map(
        args => args.slice(args.indexOf('--runTestsByPath') + 1).length
      )
    ).toEqual([2, 2, 1]);
    expect(JSON.stringify(shardCommands)).not.toMatch(/coverage/);
    expect(output.report()).toMatchObject({
      selectedTests: files.map(file =>
        path.relative(process.cwd(), file).split(path.sep).join('/')
      ),
      result: 'passed',
    });
  });

  it('fails when Git cannot list fallback unit tests', () => {
    const outcomes = [
      {
        discovery: { status: 1, stdout: '', error: new Error('list failed') },
        failure: 'list failed',
      },
      {
        discovery: { status: 1, stdout: '' },
        failure: 'Git unit-test discovery exited with status 1.',
      },
    ];

    for (const { discovery, failure } of outcomes) {
      const { result, output } = runHandle({
        argv: ['--unsupported'],
        runImpl: (command, args) =>
          command === 'git' && args.includes('--exclude-standard')
            ? discovery
            : { status: 0, stdout: '' },
      });

      expect(result).toEqual({ exitCode: 1 });
      expect(output.report()).toMatchObject({
        testSelection: 'all-unit',
        fallbackFailure: failure,
        result: 'failed',
        exitStatus: 1,
      });
    }
  });

  it('omits deleted test paths from the current-worktree fallback inventory', () => {
    const { result, output } = runHandle({
      argv: ['--files', 'docs/guide.md'],
      fileExists: filePath => filePath.endsWith('present.test.js'),
      runImpl: (command, args) =>
        command === 'git' && args.includes('--exclude-standard')
          ? {
              status: 0,
              stdout: 'test/core/present.test.js\0test/core/deleted.test.js\0',
            }
          : { status: 0, stdout: '' },
    });

    expect(result).toEqual({ exitCode: 0 });
    expect(output.report()).toMatchObject({
      selectedTests: ['test/core/present.test.js'],
      result: 'passed',
    });
  });

  it('uses safe defaults when fallback discovery returns no output', () => {
    const { result, output } = runHandle({
      argv: ['--unsupported'],
      runImpl: (command, args) =>
        command === 'git' && args.includes('--exclude-standard')
          ? { status: 0 }
          : { status: 0, stdout: '' },
    });

    expect(result).toEqual({ exitCode: 1 });
    expect(output.report()).toMatchObject({
      selectedTests: [],
      fallbackFailure: 'Jest did not identify unit test files to execute.',
      result: 'failed',
      exitStatus: 1,
    });
  });

  it('normalizes absolute fallback paths and rejects an invalid shard size', () => {
    const absolutePath = path.resolve('test/core/absolute-fallback.test.js');
    const { result, output, runCommand } = runHandle({
      argv: ['--unsupported'],
      impactShardSize: 0,
      runImpl: (command, args) => {
        if (command === 'git' && args.includes('--exclude-standard'))
          return { status: 0, stdout: `${absolutePath}\0` };
        return {
          status: 0,
          stdout: 'tests passed\n',
          stderr: 'runner notice\n',
        };
      },
    });

    expect(result).toEqual({ exitCode: 0 });
    const invocation = runCommand.mock.calls.find(
      call => call[1] === process.execPath
    );
    expect(invocation?.[2]).toContain('test/core/absolute-fallback.test.js');
    expect(output.chunks).toContain('runner notice\n');
    expect(output.report()).toMatchObject({
      selectedTests: ['test/core/absolute-fallback.test.js'],
      result: 'passed',
    });
  });

  it('falls back for incomplete, conflicting, and unsafe argument forms', () => {
    const inputs = [
      { argv: ['--files'] },
      { argv: ['--base'] },
      {
        argv: ['--files', 'test/core/explicit.test.js'],
        defaultBaseRef: 'origin/main',
      },
      { argv: ['--base', '-unsafe-ref'] },
    ];

    for (const input of inputs) {
      const { result, output } = runHandle({
        ...input,
        runImpl: (command, args) =>
          command === 'git' && args.includes('-co')
            ? { status: 0, stdout: 'test/core/fallback.test.js\0' }
            : { status: 0, stdout: '' },
      });

      expect(result).toEqual({ exitCode: 0 });
      expect(output.report()).toMatchObject({
        testSelection: 'all-unit',
        selectedTests: ['test/core/fallback.test.js'],
        result: 'passed',
      });
    }
  });

  it('handles missing related-test output and selector errors without messages', () => {
    for (const selectorResult of [{ status: 0 }, { status: 1 }]) {
      const { result, output } = runHandle({
        argv: ['--files', 'src/core/example.js'],
        runImpl: (command, args) => {
          if (args.includes('--findRelatedTests')) return selectorResult;
          if (command === 'git' && args.includes('-co'))
            return { status: 0, stdout: 'test/core/fallback.test.js\0' };
          return { status: 0, stdout: '' };
        },
      });

      expect(result).toEqual({ exitCode: 0 });
      expect(output.report()).toMatchObject({
        testSelection: 'all-unit',
        selectedTests: ['test/core/fallback.test.js'],
        result: 'passed',
      });
    }
  });

  it('treats absent Git output as an empty clean-tree comparison', () => {
    const calls = [];
    const { result, output } = runHandle({
      argv: ['--base', 'origin/main'],
      runImpl: (command, args) => {
        calls.push(args);
        if (command === 'git' && args[0] === 'rev-parse')
          return { status: 0, stdout: 'abcdef123456\n' };
        return { status: 0 };
      },
    });

    expect(result).toEqual({ exitCode: 0 });
    expect(calls).toHaveLength(5);
    expect(output.report()).toMatchObject({
      changedPaths: [],
      testSelection: 'none',
      result: 'skipped',
    });
  });

  it('falls back when the selected Git base cannot be resolved or compared', () => {
    const failures = [
      { phase: 'resolve', result: { status: 1, stdout: 'abcdef123456\n' } },
      { phase: 'resolve', result: { status: 0, stdout: '  ' } },
      {
        phase: 'resolve',
        result: {
          status: 0,
          stdout: 'abcdef123456\n',
          error: new Error('base lookup failed'),
        },
      },
      { phase: 'compare', result: { status: 1, stdout: '' } },
      {
        phase: 'compare',
        result: { status: 0, error: new Error('base diff failed') },
      },
    ];

    for (const failure of failures) {
      const { result, output } = runHandle({
        argv: ['--base', 'origin/main'],
        runImpl: (command, args) => {
          if (command === 'git' && args[0] === 'rev-parse')
            return failure.phase === 'resolve'
              ? failure.result
              : { status: 0, stdout: 'abcdef123456\n' };
          if (
            command === 'git' &&
            args[0] === 'diff' &&
            args.some(argument => argument.includes('...HEAD'))
          )
            return failure.phase === 'compare'
              ? failure.result
              : { status: 0, stdout: '' };
          if (command === 'git' && args.includes('-co'))
            return { status: 0, stdout: 'test/core/fallback.test.js\0' };
          return { status: 0, stdout: '' };
        },
      });

      expect(result).toEqual({ exitCode: 0 });
      expect(output.report()).toMatchObject({
        testSelection: 'all-unit',
        selectedTests: ['test/core/fallback.test.js'],
        result: 'passed',
      });
    }
  });
});

describe('logic migration scoped enforcement', () => {
  it.each(['src/logic/core/example.js', 'src/logic/boundary/example.js'])(
    'fails closed when %s is not collected',
    file => {
      const { result, output, runCoverage } = runHandle({
        createHandle: createRunScopedCheckImpactHandle,
        argv: ['--files', file],
        coverageImpl: () => ({ status: 0, coverage: {} }),
        runImpl: (_command, args) =>
          args.includes('--findRelatedTests')
            ? { status: 0, stdout: 'test/core/related.test.js\n' }
            : { status: 0, stdout: '' },
      });
      expect(runCoverage).toHaveBeenCalledWith(
        expect.anything(),
        ['test/core/related.test.js'],
        [file]
      );
      expect(result.exitCode).toBe(1);
      expect(output.report().scopedCoverage.files).toEqual([
        { file, collected: false, uncoveredLines: [], uncoveredBranches: [] },
      ]);
    }
  );
});
