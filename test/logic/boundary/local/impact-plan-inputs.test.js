import { parseImpactPlanInputs } from '../../../../src/logic/boundary/local/impact-plan-inputs.js';

describe('parseImpactPlanInputs', () => {
  it.each([
    undefined,
    {},
    false,
    0,
    '',
    17,
    true,
    'options',
    [],
    Symbol('options'),
  ])('interprets default fields for candidate %p', options => {
    expect(parseImpactPlanInputs(options)).toEqual({
      ok: true,
      evidence: {
        changes: { paths: [], invalid: undefined, sources: [], tests: [] },
        discovery: { paths: [], resolved: false },
        collectionError: '',
      },
    });
  });

  it('normalizes and classifies paths while retaining first invalid evidence', () => {
    expect(
      parseImpactPlanInputs({
        changedPaths: [
          './src\\core\\a.js',
          'test/core/b.test.js',
          'docs/a.md',
          'src/core/a.js',
        ],
        relatedTestPaths: [
          './test/core/a.test.js',
          'test/core/a.test.js',
          'test/e2e/a.test.js',
          'src/core/a.js',
        ],
        relatedTestsResolved: 1,
      })
    ).toEqual({
      ok: true,
      evidence: {
        changes: {
          paths: ['docs/a.md', 'src/core/a.js', 'test/core/b.test.js'],
          invalid: 'docs/a.md',
          sources: ['src/core/a.js'],
          tests: ['test/core/b.test.js'],
        },
        discovery: { paths: ['test/core/a.test.js'], resolved: true },
        collectionError: '',
      },
    });
  });

  it.each([{}, [], Symbol('reason'), () => 'reason', 1, true, null, 0, false])(
    'retains opaque collection payload %p by identity',
    collectionError => {
      expect(
        parseImpactPlanInputs({ collectionError }).evidence.collectionError
      ).toBe(collectionError);
    }
  );

  it('converts discovery truthiness without invoking object coercion', () => {
    const relatedTestsResolved = {
      valueOf() {
        throw new Error('coercion');
      },
      toString() {
        throw new Error('coercion');
      },
    };
    expect(
      parseImpactPlanInputs({ relatedTestsResolved }).evidence.discovery
        .resolved
    ).toBe(true);
  });

  it.each([
    null,
    { changedPaths: null },
    { changedPaths: 17 },
    { changedPaths: 'paths' },
    { changedPaths: Array(1) },
    { relatedTestPaths: null },
    { relatedTestPaths: Array(1) },
  ])(
    'returns original structural error for %p without a silent empty success',
    options => {
      const result = parseImpactPlanInputs(options);
      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(TypeError);
    }
  );

  for (const field of [
    'changedPaths',
    'relatedTestPaths',
    'relatedTestsResolved',
    'collectionError',
  ]) {
    it.each([
      undefined,
      null,
      false,
      0,
      'failure',
      Symbol('failure'),
      {},
      new Error('original'),
    ])(`retains exact ${field} getter failure %p and read order`, failure => {
      const trace = [];
      const options = {};
      const fields = [
        'changedPaths',
        'relatedTestPaths',
        'relatedTestsResolved',
        'collectionError',
      ];
      for (const name of fields)
        Object.defineProperty(options, name, {
          get() {
            trace.push(name);
            if (name === field) throw failure;
            return undefined;
          },
        });
      const result = parseImpactPlanInputs(options);
      expect(result.ok).toBe(false);
      expect(result.error).toBe(failure);
      expect(trace).toEqual(fields.slice(0, fields.indexOf(field) + 1));
    });
  }
});
