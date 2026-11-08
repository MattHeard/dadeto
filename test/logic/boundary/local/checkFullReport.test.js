import { describe, expect, test } from '@jest/globals';
import { parseCheckFullReportEvidence } from '../../../../src/logic/boundary/local/checkFullReport.js';

const metrics = pct =>
  Object.fromEntries(
    ['statements', 'branches', 'functions', 'lines'].map(key => [key, { pct }])
  );
const unavailable = {
  suites: null,
  tests: null,
  passed: null,
  failed: null,
  complete: false,
  completedShards: null,
  totalShards: null,
};
const parse = (
  coverageRunText = '',
  coverageSummaryText = '',
  failureLog = ''
) =>
  parseCheckFullReportEvidence({
    coverageRunText,
    coverageSummaryText,
    failureLog,
  });
const evidence = result => {
  expect(result.ok).toBe(true);
  return result.evidence;
};

describe('raw report evidence categories', () => {
  test.each([
    [{ total: null }, 'statements'],
    [{ total: { statements: null } }, 'pct'],
    [{ total: metrics(100), malformed: { statements: null } }, 'pct'],
  ])(
    'preserves an explicit error for null metric containers %j',
    (summary, field) => {
      const result = parse('', JSON.stringify(summary));
      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(TypeError);
      expect(result.error.message).toBe(
        `Cannot read properties of null (reading '${field}')`
      );
    }
  );
  test.each(['', '{', 'undefined', 'null', 'false', '0', '""'])(
    'preserves absent/falsy runner semantics for %p',
    text => {
      expect(evidence(parse(text))).toEqual({
        tests: unavailable,
        coverage: null,
        runPresent: false,
        failure: { kind: 'other', running: false },
      });
    }
  );

  test.each(['true', '7', '"text"', '[]', '{}', '1e400'])(
    'preserves truthy runner presence with unavailable counts for %p',
    text => {
      expect(evidence(parse(text))).toEqual({
        tests: unavailable,
        coverage: null,
        runPresent: true,
        failure: { kind: 'other', running: false },
      });
    }
  );

  test.each(['', '{', 'undefined', 'null'])(
    'treats unreadable/invalid/null coverage %p as unavailable',
    text => {
      expect(evidence(parse('', text)).coverage).toBeNull();
    }
  );

  test.each(['false', 'true', '0', '7', '""', '"text"', '[]', '{}'])(
    'returns an explicit shape failure for valid JSON %p',
    text => {
      const result = parse('', text);
      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(TypeError);
      expect(result.error.message).toBe(
        "Cannot read properties of undefined (reading 'statements')"
      );
    }
  );

  test.each([null, true, false, '100', [], {}, 1e400, -1e400])(
    'does not coerce percentage %p',
    value => {
      const summary = { total: metrics(100) };
      summary.total.statements.pct = value;
      expect(evidence(parse('', JSON.stringify(summary))).coverage).toBeNull();
    }
  );

  test.each([-1, 0, 50, 100, 101])(
    'preserves finite percentage %p as domain data',
    value => {
      expect(
        evidence(parse('', JSON.stringify({ total: metrics(value) }))).coverage
      ).toEqual({
        total: {
          statements: value,
          branches: value,
          functions: value,
          lines: value,
        },
        files: [],
      });
    }
  );

  test('preserves overflow JSON numbers as unavailable without accepting partial metrics', () => {
    expect(
      evidence(parse('', '{"total":{"statements":{"pct":1e400}}}')).coverage
    ).toBeNull();
    expect(
      evidence(parse('', '{"total":{"statements":{"pct":null}}}')).coverage
    ).toBeNull();
    const result = parse('', '{"total":{"statements":{"pct":100}}}');
    expect(result.ok).toBe(false);
    expect(result.error.message).toBe(
      "Cannot read properties of undefined (reading 'pct')"
    );
  });

  test('retains valid file order, skips null/nonfinite entries and rejects malformed file shape', () => {
    const raw = {
      total: metrics(100),
      'src/logic/core/z.js': metrics(98),
      ignored: null,
      invalid: metrics(null),
      'src/core/a.js': metrics(100),
    };
    expect(evidence(parse('', JSON.stringify(raw))).coverage.files).toEqual([
      {
        file: 'src/logic/core/z.js',
        metrics: { statements: 98, branches: 98, functions: 98, lines: 98 },
      },
      {
        file: 'src/core/a.js',
        metrics: { statements: 100, branches: 100, functions: 100, lines: 100 },
      },
    ]);
    raw.invalid = {};
    const result = parse('', JSON.stringify(raw));
    expect(result.ok).toBe(false);
    expect(result.error.message).toBe(
      "Cannot read properties of undefined (reading 'pct')"
    );
  });
});

describe('normalized correlated count states', () => {
  test.each([
    '{"testSuites":2}',
    '{"tests":3}',
    '{"testSuites":"2","tests":3}',
    '{"testSuites":2,"tests":1e400}',
  ])('preserves the complete unknown-count state for %s', text => {
    expect(evidence(parse(text)).tests).toEqual(unavailable);
  });

  test('preserves finite counts, unknown optional counts and completion correlation', () => {
    expect(
      evidence(
        parse(
          '{"testSuites":2,"tests":3,"passed":0,"failed":1,"completedShards":1,"totalShards":2}'
        )
      ).tests
    ).toEqual({
      suites: 2,
      tests: 3,
      passed: 0,
      failed: 1,
      complete: false,
      completedShards: 1,
      totalShards: 2,
    });
    expect(
      evidence(
        parse(
          '{"testSuites":0,"tests":0,"passed":"0","failed":null,"completedShards":0,"totalShards":0}'
        )
      ).tests
    ).toEqual({
      suites: 0,
      tests: 0,
      passed: null,
      failed: null,
      complete: true,
      completedShards: 0,
      totalShards: 0,
    });
    expect(
      evidence(parse('{"testSuites":-0,"tests":-2,"completedShards":1}')).tests
    ).toEqual({
      suites: -0,
      tests: -2,
      passed: null,
      failed: null,
      complete: false,
      completedShards: 1,
      totalShards: null,
    });
  });
});

describe('failure interpretation and outer error propagation', () => {
  test.each([
    ['heap out of memory', 'heap'],
    ['javascript heap', 'heap'],
    ['heap limit', 'heap'],
    ['allocation failed', 'heap'],
    ['timed out', 'timeout'],
    ['TIMEOUT', 'timeout'],
    ['SIGTERM', 'timeout'],
    ['Test suite: 1 failed', 'unit-failure'],
    ['Test suites: 1 failed', 'unit-failure'],
    ['Test: 2 failed', 'unit-failure'],
    ['Tests: 2 failed', 'unit-failure'],
    ['coverage shard failed', 'unit-failure'],
  ])('classifies %p', (text, kind) => {
    expect(evidence(parse('{}', '', text)).failure).toEqual({ kind });
    expect(
      evidence(parse(JSON.stringify({ failureReason: text }))).failure
    ).toEqual({ kind });
  });

  test('retains severity precedence across reason/log lines without joining words', () => {
    expect(
      evidence(parse('{"failureReason":"timeout"}', '', 'heap limit')).failure
    ).toEqual({ kind: 'heap' });
    expect(
      evidence(parse('{"failureReason":"test failed"}', '', 'timeout')).failure
    ).toEqual({ kind: 'timeout' });
    expect(
      evidence(parse('{"failureReason":"test"}', '', ' failed')).failure
    ).toEqual({ kind: 'custom', message: 'test' });
    expect(evidence(parse('{"status":"running"}')).failure).toEqual({
      kind: 'other',
      running: true,
    });
  });

  test.each([
    ['custom reason', 'custom reason'],
    [17, '17'],
    [true, 'true'],
    [[], ''],
    [[1, null], '1,'],
    [{ value: 1 }, '[object Object]'],
  ])('preserves truthy custom reason %p', (reason, message) => {
    expect(
      evidence(parse(JSON.stringify({ failureReason: reason }))).failure
    ).toEqual({ kind: 'custom', message });
  });

  test.each([null, false, 0, ''])(
    'does not manufacture a custom reason for %p',
    reason => {
      expect(
        evidence(parse(JSON.stringify({ failureReason: reason }))).failure
      ).toEqual({ kind: 'other', running: false });
    }
  );

  test('does not inspect an irrelevant malformed failure reason when coverage is available', () => {
    const run = JSON.stringify({ failureReason: { toString: 17 } });
    const failed = parse(run);
    expect(failed.ok).toBe(false);
    expect(failed.error).toBeInstanceOf(TypeError);
    expect(failed.error.message).toBe(
      'Cannot convert object to primitive value'
    );
    expect(
      evidence(parse(run, JSON.stringify({ total: metrics(100) }))).failure
    ).toBeNull();
  });
});
