import { parseMissedCoverage } from '../../../../src/logic/boundary/local/missed-coverage.js';

describe('parseMissedCoverage', () => {
  it.each([undefined, null, false, 0, '', NaN])(
    'retains missing-record state for %p',
    value => {
      expect(parseMissedCoverage(value)).toEqual({
        ok: true,
        evidence: {
          collected: false,
          uncoveredLines: [],
          uncoveredBranches: [],
        },
      });
    }
  );

  it.each([
    {},
    { statementMap: null, s: null, branchMap: null, b: null },
    17,
    true,
    'record',
    [],
  ])('interprets empty candidate %p without inventing misses', value => {
    expect(parseMissedCoverage(value)).toEqual({
      ok: true,
      evidence: { collected: true, uncoveredLines: [], uncoveredBranches: [] },
    });
  });

  it('sorts unique statement lines numerically and accepts every integer', () => {
    const lines = [10, -2, 10, 1, 2 ** 53, -0];
    const record = {
      s: Object.fromEntries(lines.map((_, i) => [i, 0])),
      statementMap: Object.fromEntries(
        lines.map((line, i) => [i, { start: { line } }])
      ),
    };
    const result = parseMissedCoverage(record);
    expect(result).toEqual({
      ok: true,
      evidence: {
        collected: true,
        uncoveredLines: [-2, 0, 1, 10, 2 ** 53],
        uncoveredBranches: [],
      },
    });
    expect(Object.is(result.evidence.uncoveredLines[1], 0)).toBe(true);
  });

  it('uses strict numeric zero counts and ignores unavailable statement locations', () => {
    const counts = [0, -0, 1, -1, '0', false, null, undefined, NaN];
    const s = Object.fromEntries(counts.map((value, i) => [i, value]));
    const statementMap = Object.fromEntries(
      counts.map((_, i) => [i, { start: { line: i + 1 } }])
    );
    Object.assign(s, { missing: 0, noStart: 0, invalid: 0 });
    Object.assign(statementMap, {
      noStart: {},
      invalid: { start: { line: '3' } },
    });
    expect(
      parseMissedCoverage({ s, statementMap }).evidence.uncoveredLines
    ).toEqual([1, 2]);
  });

  it('preserves branch insertion order, one-based arms and nullish line fallback', () => {
    const record = {
      b: { z: [0, 1, 0, 0, 0, 0, 0], a: [0] },
      branchMap: {
        z: {
          line: 9,
          locations: [
            { start: { line: 4 } },
            {},
            { start: { line: null } },
            { start: { line: '2' } },
            { start: { line: -1 } },
            { start: { line: 0 } },
            null,
          ],
        },
        a: { line: 1 },
      },
    };
    expect(parseMissedCoverage(record).evidence.uncoveredBranches).toEqual([
      { line: 4, arm: 1 },
      { line: 9, arm: 3 },
      { line: -1, arm: 5 },
      { line: 0, arm: 6 },
      { line: 9, arm: 7 },
      { line: 1, arm: 1 },
    ]);
  });

  it('skips sparse branch holes, strict nonzero counts and unavailable branch metadata', () => {
    const arms = Array(4);
    arms[2] = 0;
    expect(
      parseMissedCoverage({
        b: { a: arms, missing: [0], counts: ['0', null, false] },
        branchMap: { a: { line: 3 } },
      }).evidence.uncoveredBranches
    ).toEqual([{ line: 3, arm: 3 }]);
  });

  it.each([1, 'bad', {}, null, undefined])(
    'reports native malformed-arm errors for %p',
    arms => {
      const result = parseMissedCoverage({ b: { a: arms } });
      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(TypeError);
    }
  );

  for (const field of ['statementMap', 's', 'branchMap', 'b']) {
    it.each([
      undefined,
      null,
      false,
      0,
      'failure',
      Symbol('failure'),
      {},
      new Error('original'),
    ])(
      `retains exact ${field} getter failure %p and short-circuits later reads`,
      failure => {
        const trace = [];
        const record = {};
        const fields = ['statementMap', 's', 'branchMap', 'b'];
        for (const name of fields)
          Object.defineProperty(record, name, {
            get() {
              trace.push(name);
              if (name === field) throw failure;
              return {};
            },
          });
        const result = parseMissedCoverage(record);
        expect(result.ok).toBe(false);
        expect(result.error).toBe(failure);
        expect(trace).toEqual(fields.slice(0, fields.indexOf(field) + 1));
      }
    );
  }

  it('does not mutate input records or reuse evidence arrays across calls', () => {
    const record = Object.freeze({
      s: Object.freeze({ a: 0 }),
      statementMap: Object.freeze({
        a: Object.freeze({ start: Object.freeze({ line: 2 }) }),
      }),
    });
    const first = parseMissedCoverage(record);
    const second = parseMissedCoverage(record);
    expect(first).toEqual(second);
    expect(first.evidence).not.toBe(second.evidence);
    expect(first.evidence.uncoveredLines).not.toBe(
      second.evidence.uncoveredLines
    );
  });
});
