import { createCheckImpactPlan } from '../../../src/core/local/checkImpactPlan.js';

describe('createCheckImpactPlan', () => {
  it('retains the original optional-argument public arity', () => {
    expect(createCheckImpactPlan).toHaveLength(0);
  });
  it('propagates the established structural error for sparse related candidates', () => {
    expect(() =>
      createCheckImpactPlan({
        changedPaths: ['src/core/a.js'],
        relatedTestPaths: new Array(1),
        relatedTestsResolved: true,
      })
    ).toThrow("Cannot read properties of undefined (reading 'startsWith')");
  });
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

  it.each([
    'other/module.js',
    'else/a.test.js',
    'src/core/file.ts',
    'z/unsupported.md',
    42,
    '',
  ])(
    'falls back for mixed supported and unsupported changes including %p',
    unsupported => {
      const plan = createCheckImpactPlan({
        changedPaths: ['src/core/a.js', unsupported],
        relatedTestsResolved: true,
        relatedTestPaths: ['test/core/valid.test.js'],
      });
      expect(plan).toMatchObject({
        mode: 'fallback',
        testSelection: 'all-unit',
        tests: [],
        reason: `Unsupported or unsafe changed path: ${unsupported === 42 || unsupported === '' ? '(empty)' : unsupported}.`,
      });
    }
  );

  it('sorts and deduplicates mixed direct and related unit tests', () => {
    expect(
      createCheckImpactPlan({
        changedPaths: ['test/core/m.test.js', 'src/core/a.js'],
        relatedTestsResolved: true,
        relatedTestPaths: [
          'test/core/z.test.js',
          'test/core/a.test.js',
          'test/core/m.test.js',
          'other/not-unit.test.js',
        ],
      })
    ).toMatchObject({
      mode: 'selected',
      changedPaths: ['src/core/a.js', 'test/core/m.test.js'],
      tests: [
        'test/core/a.test.js',
        'test/core/m.test.js',
        'test/core/z.test.js',
      ],
      testSelection: 'related',
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
