import { createCheckImpactPlan } from '../../../src/core/local/checkImpactPlan.js';

describe('createCheckImpactPlan', () => {
  it('falls back to the authoritative check when no paths are supplied', () => {
    expect(createCheckImpactPlan()).toEqual({
      mode: 'full-check',
      changedPaths: [],
      tests: [],
      commands: ['npm run check'],
      reason: 'No changed paths were provided.',
      authoritative: 'npm run check',
    });
  });

  it('falls back for unsupported and unsafe paths', () => {
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
      ).toMatchObject({
        mode: 'full-check',
        commands: ['npm run check'],
      });
    }
    expect(createCheckImpactPlan({ changedPaths: [''] }).reason).toBe(
      'Unsupported or unsafe changed path: (empty).'
    );
    expect(
      createCheckImpactPlan({ changedPaths: ['../test/a.test.js'] }).reason
    ).toBe('Unsupported or unsafe changed path: (empty).');
  });

  it('requires a successful related-test query for source changes', () => {
    expect(
      createCheckImpactPlan({
        changedPaths: ['src/core/local/checkImpactPlan.js'],
      })
    ).toMatchObject({
      mode: 'full-check',
      reason: 'Jest related-test discovery did not complete successfully.',
    });
    expect(
      createCheckImpactPlan({
        changedPaths: ['src/core/local/checkImpactPlan.js'],
        relatedTestsResolved: true,
        relatedTestPaths: ['test/e2e/ignored.test.js', '../outside.test.js'],
      })
    ).toMatchObject({
      mode: 'full-check',
      reason: 'Jest did not identify related unit tests for changed source.',
    });
  });

  it('sorts and deduplicates changed paths and related unit tests', () => {
    const plan = createCheckImpactPlan({
      changedPaths: [
        './test/core/z.test.js',
        'test/core/a.test.js',
        'test/core/a.test.js',
        'src/core/local/checkImpactPlan.js',
      ],
      relatedTestsResolved: true,
      relatedTestPaths: [
        'test/core/z.test.js',
        'test/core/related.test.js',
        'test/core/related.test.js',
      ],
    });

    expect(plan).toEqual({
      mode: 'diagnostic',
      changedPaths: [
        'src/core/local/checkImpactPlan.js',
        'test/core/a.test.js',
        'test/core/z.test.js',
      ],
      staticGates: ['eslint', 'core-parse'],
      tests: [
        'test/core/a.test.js',
        'test/core/related.test.js',
        'test/core/z.test.js',
      ],
      commands: [
        "npx eslint --no-cache --max-warnings=0 'src/core/local/checkImpactPlan.js' 'test/core/a.test.js' 'test/core/related.test.js' 'test/core/z.test.js'",
        "node scripts/run-jest.js --runInBand --runTestsByPath 'test/core/a.test.js' 'test/core/related.test.js' 'test/core/z.test.js'",
        'npm run core-parse',
        'npm run check',
      ],
      authoritative: 'npm run check',
    });
  });

  it('quotes unusual test paths in the printable command', () => {
    const plan = createCheckImpactPlan({
      changedPaths: ["test/core/it's-a-test.test.js"],
    });

    expect(plan.tests).toEqual(["test/core/it's-a-test.test.js"]);
    expect(plan.commands[0]).toContain("'test/core/it'\\''s-a-test.test.js'");
    expect(plan.commands[1]).toContain("'test/core/it'\\''s-a-test.test.js'");
  });

  it('normalizes Windows separators in changed test paths', () => {
    expect(
      createCheckImpactPlan({
        changedPaths: ['test\\core\\changed.test.js'],
      }).changedPaths
    ).toEqual(['test/core/changed.test.js']);
  });

  it('accepts supported source roots when related tests resolve', () => {
    for (const sourcePath of [
      'src/browser/app.js',
      'src/cloud/app.js',
      'src/core/app.js',
      'src/local/app.js',
    ]) {
      expect(
        createCheckImpactPlan({
          changedPaths: [sourcePath],
          relatedTestsResolved: true,
          relatedTestPaths: ['test/core/app.test.js'],
        }).mode
      ).toBe('diagnostic');
    }
  });
});
