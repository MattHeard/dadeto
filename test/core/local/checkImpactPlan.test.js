import path from 'node:path';
import {
  createCheckImpactPlan,
  createScopedCoverageCommand,
} from '../../../src/core/local/checkImpactPlan.js';

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
    expect(result.options).toMatchObject({
      cwd: '/repo',
      timeout: 120 * 60 * 1000,
      stdio: 'inherit',
      env: { NODE_ENV: 'test', DADETO_COVERAGE_SHARD: '1' },
    });
  });
});

describe('createCheckImpactPlan', () => {
  it('reports that no tests are selected when there are no changes', () => {
    expect(createCheckImpactPlan()).toEqual({
      mode: 'none',
      changedPaths: [],
      tests: [],
      testSelection: 'none',
      staticGates: [],
      commands: [],
      reason: 'No changed source or unit-test paths were found.',
      authoritative: 'npm run check:full',
    });
  });

  it('plans direct changed unit tests without coverage flags', () => {
    const plan = createCheckImpactPlan({
      changedPaths: ['test/core/z.test.js', 'test/core/a.test.js'],
    });

    expect(plan).toMatchObject({
      mode: 'selected',
      testSelection: 'direct',
      tests: ['test/core/a.test.js', 'test/core/z.test.js'],
    });
    expect(plan.commands.join(' ')).not.toMatch(/coverage|npm test/);
  });

  it('plans related tests and explains unsupported or unsafe paths', () => {
    const related = createCheckImpactPlan({
      changedPaths: ['src/core/local/checkImpactPlan.js'],
      relatedTestsResolved: true,
      relatedTestPaths: ['test/core/a.test.js'],
    });
    expect(related).toMatchObject({
      mode: 'selected',
      testSelection: 'related',
      tests: ['test/core/a.test.js'],
      staticGates: ['eslint', 'core-parse', 'duplication'],
    });

    for (const changedPath of [
      'docs/guide.md',
      '../test/a.test.js',
      '/tmp/a.test.js',
      '',
      null,
      'src/core/module.ts',
      'test/core/example.js',
    ]) {
      expect(
        createCheckImpactPlan({ changedPaths: [changedPath] })
      ).toMatchObject({ mode: 'fallback', testSelection: 'all-unit' });
    }
  });

  it('falls back to all unit tests if discovery fails or finds no tests', () => {
    expect(
      createCheckImpactPlan({
        changedPaths: ['src/core/local/checkImpactPlan.js'],
      })
    ).toMatchObject({
      mode: 'fallback',
      testSelection: 'all-unit',
      reason: 'Jest related-test discovery did not complete successfully.',
    });
    expect(
      createCheckImpactPlan({
        changedPaths: ['src/core/local/checkImpactPlan.js'],
        relatedTestsResolved: true,
        relatedTestPaths: ['test/e2e/ignored.test.js', '../outside.test.js'],
      })
    ).toMatchObject({
      mode: 'fallback',
      reason: 'Jest did not identify related unit tests for changed source.',
    });
  });

  it('normalizes, sorts, and deduplicates changed paths and tests', () => {
    expect(
      createCheckImpactPlan({
        changedPaths: [
          './test/core/z.test.js',
          'test\\core\\a.test.js',
          'test/core/a.test.js',
        ],
      }).tests
    ).toEqual(['test/core/a.test.js', 'test/core/z.test.js']);
  });

  it('quotes display paths without making them shell-evaluated inputs', () => {
    const plan = createCheckImpactPlan({
      changedPaths: ["test/core/it's-a-test.test.js"],
    });

    expect(plan.tests).toEqual(["test/core/it's-a-test.test.js"]);
    expect(plan.commands[0]).toContain("'test/core/it'\\''s-a-test.test.js'");
  });

  it('supports JavaScript changes anywhere under src', () => {
    expect(
      createCheckImpactPlan({
        changedPaths: ['src/build/generate.js'],
        relatedTestsResolved: true,
        relatedTestPaths: ['test/build/generate.test.js'],
      })
    ).toMatchObject({
      mode: 'selected',
      testSelection: 'related',
      tests: ['test/build/generate.test.js'],
    });
  });
});

describe('logic migration coverage planning', () => {
  it.each(['src/core/', 'src/logic/core/', 'src/logic/boundary/'])(
    'retains measured logic gates for %s',
    root => {
      const plan = createCheckImpactPlan({
        changedPaths: [`${root}example.js`],
        relatedTestsResolved: true,
        relatedTestPaths: ['test/core/related.test.js'],
      });
      expect(plan.staticGates).toEqual(['eslint', 'core-parse', 'duplication']);
    }
  );
  it.each([
    'src/coreish/',
    'src/logic/coreish/',
    'src/logic/boundaryish/',
    'src/logic/other/',
  ])('does not misclassify the integration path %s', root => {
    expect(
      createCheckImpactPlan({
        changedPaths: [`${root}example.js`],
        relatedTestsResolved: true,
        relatedTestPaths: ['test/core/related.test.js'],
      }).staticGates
    ).toEqual(['eslint']);
  });
});
