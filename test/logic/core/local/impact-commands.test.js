import path from 'node:path';
import {
  createScopedCoverageCommand,
  commandOptions,
  quotePath,
  JEST_RUNNER,
} from '../../../../src/logic/core/local/impact-commands.js';

describe('createScopedCoverageCommand', () => {
  it('limits Jest coverage to requested files and renders a reproducible command', () => {
    const result = createScopedCoverageCommand({
      paths: { rootDir: '/repo', pathModule: path },
      coverageDirectory: '/tmp/coverage',
      selection: {
        tests: ['test/core/example.test.js'],
        sourceFiles: ['src/core/example.js'],
      },
      environment: { NODE_ENV: 'test' },
    });

    expect(result.args).toEqual([
      '/repo/scripts/run-jest.js',
      '--runInBand',
      '--coverage',
      '--coverageReporters=json',
      '--coverageThreshold={"global":{"branches":0,"functions":0,"lines":0,"statements":0}}',
      '--coverageDirectory',
      '/tmp/coverage',
      '--collectCoverageFrom=src/core/example.js',
      '--runTestsByPath',
      'test/core/example.test.js',
    ]);
    expect(result.command).toContain(
      "'--coverageDirectory' '<temporary-coverage-dir>'"
    );
    expect(result.command).not.toContain('/tmp/coverage');
    expect(result.command).toBe(
      "'node' 'scripts/run-jest.js' '--runInBand' '--coverage' '--coverageReporters=json' '--coverageThreshold={\"global\":{\"branches\":0,\"functions\":0,\"lines\":0,\"statements\":0}}' '--coverageDirectory' '<temporary-coverage-dir>' '--collectCoverageFrom=src/core/example.js' '--runTestsByPath' 'test/core/example.test.js'"
    );
    expect(result.options).toMatchObject({
      cwd: '/repo',
      timeout: 120 * 60 * 1000,
      stdio: 'inherit',
      env: { NODE_ENV: 'test', DADETO_COVERAGE_SHARD: '1' },
    });
  });
});

describe('trusted command primitives', () => {
  test.each([
    ['', "''"],
    ['abc', "'abc'"],
    ["it's", "'it'\\''s'"],
    ['line\nbreak', "'line\nbreak'"],
    ['$(literal)', "'$(literal)'"],
  ])('quotes the preview without interpreting %p', (value, expected) => {
    expect(quotePath(value)).toBe(expected);
  });

  test.each([undefined, false, true])(
    'retains bounded process options and stream state %p',
    stream => {
      const result = commandOptions('/repo', 45_000, stream);
      expect(result).toEqual({
        cwd: '/repo',
        encoding: 'utf8',
        timeout: 45_000,
        maxBuffer: 16_777_216,
        ...(stream ? { stdio: 'inherit' } : {}),
      });
      expect(result).not.toHaveProperty('env');
    }
  );

  test('delegates the original path receiver before reading environment and preserves frozen input', () => {
    const trace = [];
    const pathModule = {
      join(...parts) {
        expect(this).toBe(pathModule);
        trace.push(['join', ...parts]);
        return 'virtual-runner';
      },
    };
    const environment = Object.freeze({
      get DADETO_COVERAGE_SHARD() {
        trace.push(['environment']);
        return 'old';
      },
      NODE_ENV: 'fixture',
    });
    const selection = Object.freeze({
      tests: Object.freeze([]),
      sourceFiles: Object.freeze([]),
    });
    const result = createScopedCoverageCommand({
      paths: { rootDir: '/raw root', pathModule },
      coverageDirectory: '--coverage',
      selection,
      environment,
    });
    expect(trace).toEqual([
      ['join', '/raw root', 'scripts/run-jest.js'],
      ['environment'],
    ]);
    expect(result.args[0]).toBe('virtual-runner');
    expect(result.command).toBe(
      "'node' 'scripts/run-jest.js' '--runInBand' '<temporary-coverage-dir>' '--coverageReporters=json' '--coverageThreshold={\"global\":{\"branches\":0,\"functions\":0,\"lines\":0,\"statements\":0}}' '--coverageDirectory' '<temporary-coverage-dir>' '--runTestsByPath'"
    );
    expect(result.options.env).toEqual({
      DADETO_COVERAGE_SHARD: '1',
      NODE_ENV: 'fixture',
    });
    expect(selection).toEqual({ tests: [], sourceFiles: [] });
    expect(JEST_RUNNER).toBe('scripts/run-jest.js');
  });

  test.each([
    undefined,
    null,
    false,
    0,
    'failure',
    Symbol('failure'),
    {},
    new Error('original'),
  ])('propagates original trusted port failure %p', failure => {
    let thrown = false;
    try {
      createScopedCoverageCommand({
        paths: {
          rootDir: '/repo',
          pathModule: {
            join() {
              throw failure;
            },
          },
        },
        coverageDirectory: '/coverage',
        selection: { tests: [], sourceFiles: [] },
        environment: {},
      });
    } catch (error) {
      thrown = true;
      expect(error).toBe(failure);
    }
    expect(thrown).toBe(true);
  });
});
