import { createTrustedCheckImpactPlan } from '../../../../src/logic/core/local/impact-plan.js';

const input = overrides => {
  const value = {
    changed: [],
    invalid: undefined,
    sourceChanges: [],
    directTests: [],
    related: [],
    relatedTestsResolved: false,
    collectionError: '',
    ...overrides,
  };
  return {
    changes: {
      paths: value.changed,
      invalid: value.invalid,
      sources: value.sourceChanges,
      tests: value.directTests,
    },
    discovery: { paths: value.related, resolved: value.relatedTestsResolved },
    collectionError: value.collectionError,
  };
};

describe('trusted impact planning', () => {
  it('retains the complete no-change state', () => {
    expect(createTrustedCheckImpactPlan(input())).toEqual({
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

  it.each([
    'collection failed',
    1,
    true,
    {},
    [],
    Symbol('reason'),
    () => 'opaque',
  ])(
    'retains opaque collection reason %p before other fallback states',
    reason => {
      const candidate = input({
        changed: ['docs/a.md'],
        invalid: 'docs/a.md',
        sourceChanges: ['src/core/a.js'],
        collectionError: reason,
      });
      const plan = createTrustedCheckImpactPlan(candidate);
      expect(plan).toMatchObject({
        mode: 'fallback',
        testSelection: 'all-unit',
        tests: [],
        staticGates: [],
        authoritative: 'npm run check:full',
      });
      expect(plan.reason).toBe(reason);
      expect(plan.changedPaths).toBe(candidate.changes.paths);
      expect(plan.commands).toEqual([
        'node scripts/run-jest.js --runInBand --runTestsByPath <unit-test files in bounded shards>',
      ]);
    }
  );

  it.each([
    ['', '(empty)'],
    ['docs/a.md', 'docs/a.md'],
  ])(
    'prioritizes unsupported path %p before discovery failures',
    (invalid, displayed) => {
      const plan = createTrustedCheckImpactPlan(
        input({ changed: [invalid], invalid, sourceChanges: ['src/core/a.js'] })
      );
      expect(plan.reason).toBe(
        `Unsupported or unsafe changed path: ${displayed}.`
      );
      expect(plan.mode).toBe('fallback');
    }
  );

  it.each([false, true])(
    'distinguishes unresolved and empty discovery (%p)',
    resolved => {
      const plan = createTrustedCheckImpactPlan(
        input({
          changed: ['src/core/a.js'],
          sourceChanges: ['src/core/a.js'],
          relatedTestsResolved: resolved,
        })
      );
      expect(plan.mode).toBe('fallback');
      expect(plan.reason).toBe(
        resolved
          ? 'Jest did not identify related unit tests for changed source.'
          : 'Jest related-test discovery did not complete successfully.'
      );
    }
  );

  it.each([undefined, null, false, 0, ''])(
    'preserves falsey collection evidence %p as no-change state',
    collectionError => {
      expect(
        createTrustedCheckImpactPlan(input({ collectionError })).mode
      ).toBe('none');
    }
  );

  it('sorts and deduplicates combined direct/related tests without changing input arrays', () => {
    const directTests = Object.freeze([
      'test/core/b.test.js',
      'test/core/a.test.js',
    ]);
    const related = Object.freeze([
      'test/core/a.test.js',
      'test/core/c.test.js',
    ]);
    const plan = createTrustedCheckImpactPlan(
      input({ changed: ['test/core/b.test.js'], directTests, related })
    );
    expect(plan).toEqual({
      mode: 'selected',
      changedPaths: ['test/core/b.test.js'],
      tests: [
        'test/core/a.test.js',
        'test/core/b.test.js',
        'test/core/c.test.js',
      ],
      testSelection: 'direct',
      staticGates: ['eslint'],
      commands: [
        "node scripts/run-jest.js --runInBand --runTestsByPath 'test/core/a.test.js' 'test/core/b.test.js' 'test/core/c.test.js'",
      ],
      authoritative: 'npm run check:full',
    });
  });

  it.each([
    'src/core/a.js',
    'src/logic/core/a.js',
    'src/logic/boundary/a.js',
    'src/browser/a.js',
  ])('adds logic gates only for the measured source domain %p', file => {
    const plan = createTrustedCheckImpactPlan(
      input({
        changed: [file],
        sourceChanges: [file],
        related: ['test/core/a.test.js'],
        relatedTestsResolved: true,
      })
    );
    expect(plan.mode).toBe('selected');
    expect(plan.testSelection).toBe('related');
    expect(plan.staticGates).toEqual(
      file.startsWith('src/browser/')
        ? ['eslint']
        : ['eslint', 'core-parse', 'duplication']
    );
    expect(plan.commands).toEqual(
      file.startsWith('src/browser/')
        ? [
            "node scripts/run-jest.js --runInBand --runTestsByPath 'test/core/a.test.js'",
          ]
        : [
            "node scripts/run-jest.js --runInBand --runTestsByPath 'test/core/a.test.js'",
            'npm run core-parse',
            'npm run duplication',
          ]
    );
    expect(Object.hasOwn(plan, 'reason')).toBe(false);
  });
});
