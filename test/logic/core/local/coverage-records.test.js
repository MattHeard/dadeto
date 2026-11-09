import { mergeCoverageRecords } from '../../../../src/logic/core/local/coverage-records.js';

describe('trusted Istanbul record folding', () => {
  test('keeps actual absence for an empty fold', () => {
    expect(mergeCoverageRecords([])).toBeUndefined();
  });

  test('clones the first record deeply without fabricating counter fields', () => {
    const record = Object.freeze({
      statementMap: { a: { start: { line: 8 } } },
      metadata: new Map([['key', { value: 1 }]]),
    });
    const result = mergeCoverageRecords([record]);
    expect(result).toEqual(structuredClone(record));
    expect(result).not.toBe(record);
    expect(result.statementMap).not.toBe(record.statementMap);
    expect(result.statementMap.a).not.toBe(record.statementMap.a);
    expect(result.metadata).not.toBe(record.metadata);
    expect(result.metadata.get('key')).not.toBe(record.metadata.get('key'));
    expect(result).not.toHaveProperty('s');
    expect(result).not.toHaveProperty('f');
    expect(result).not.toHaveProperty('b');
  });

  test('retains first metadata and original key order while adding counters', () => {
    const records = [
      {
        path: 'first',
        statementMap: { a: { start: { line: 8 } } },
        branchMap: { b: { line: 9 } },
        s: { z: 1, a: 2 },
        f: { z: 3 },
        b: { z: [0, 2] },
      },
      {
        path: 'later',
        statementMap: { added: { start: { line: 99 } } },
        branchMap: { added: { line: 100 } },
        s: { a: 3, b: 4 },
        f: { z: 5, b: 6 },
        b: { z: [1], added: [2, 0, 3] },
      },
    ];
    const before = structuredClone(records);
    const result = mergeCoverageRecords(records);
    expect(result).toEqual({
      path: 'first',
      statementMap: { a: { start: { line: 8 } } },
      branchMap: { b: { line: 9 } },
      s: { z: 1, a: 5, b: 4 },
      f: { z: 8, b: 6 },
      b: { z: [1, 2], added: [2, 0, 3] },
    });
    expect(Object.keys(result.s)).toEqual(['z', 'a', 'b']);
    expect(Object.keys(result.f)).toEqual(['z', 'b']);
    expect(Object.keys(result.b)).toEqual(['z', 'added']);
    expect(records).toEqual(before);
    expect(result.statementMap).not.toBe(records[0].statementMap);
  });

  test.each([
    [[{}, {}], { s: {}, f: {}, b: {} }],
    [
      [{ s: { left: 2 }, f: { left: 3 }, b: { left: [1, 0] } }, {}],
      { s: { left: 2 }, f: { left: 3 }, b: { left: [1, 0] } },
    ],
    [
      [{}, { s: { right: 2 }, f: { right: 3 }, b: { right: [1, 0] } }],
      { s: { right: 2 }, f: { right: 3 }, b: { right: [1, 0] } },
    ],
    [
      [{ b: { a: Array(3) } }, { b: { a: [2] } }],
      { s: {}, f: {}, b: { a: [2, 0, 0] } },
    ],
    [[{ b: { a: [] } }, { b: { a: [] } }], { s: {}, f: {}, b: { a: [] } }],
  ])('preserves missing-map and unequal-arm state %p', (records, expected) => {
    expect(mergeCoverageRecords(records)).toEqual(expected);
  });

  test('preserves holes on an initial clone and exact nonfinite arithmetic on later folds', () => {
    const record = {
      s: { a: -0, b: Infinity },
      f: { f: NaN },
      b: { sparse: Array(2), zero: [-0] },
    };
    const first = mergeCoverageRecords([record]);
    expect(Object.is(first.s.a, -0)).toBe(true);
    expect(0 in first.b.sparse).toBe(false);
    expect(first.b.sparse).toHaveLength(2);
    const result = mergeCoverageRecords([
      record,
      { s: { a: 0, b: -Infinity }, b: { zero: [0] } },
    ]);
    expect(Object.is(result.s.a, 0)).toBe(true);
    expect(result.s.b).toBeNaN();
    expect(result.f.f).toBeNaN();
    expect(result.b.sparse).toEqual([0, 0]);
    expect(Object.is(result.b.zero[0], 0)).toBe(true);
  });

  test('preserves legacy inherited fallback for unusual counter names', () => {
    const counts = JSON.parse('{"__proto__":2,"constructor":3,"z":0}');
    const result = mergeCoverageRecords([{ s: counts }, { s: { z: 4 } }]);
    expect(Object.keys(result.s)).toEqual(['__proto__', 'constructor', 'z']);
    expect(Object.hasOwn(result.s, '__proto__')).toBe(true);
    expect(result.s.__proto__).toBe('2[object Object]');
    expect(result.s.constructor).toBe(`3${Object}`);
    expect(result.s.z).toBe(4);
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
  ])('propagates the exact original clone getter failure %p', failure => {
    const record = Object.defineProperty({}, 'value', {
      enumerable: true,
      get() {
        throw failure;
      },
    });
    let thrown = false;
    try {
      mergeCoverageRecords([record]);
    } catch (error) {
      thrown = true;
      expect(error).toBe(failure);
    }
    expect(thrown).toBe(true);
  });

  test.each([() => 'uncloneable', Symbol('uncloneable')])(
    'preserves native clone failure for %p',
    value => {
      let error;
      try {
        mergeCoverageRecords([{ value }]);
      } catch (caught) {
        error = caught;
      }
      expect(error.name).toBe('DataCloneError');
    }
  );
});
