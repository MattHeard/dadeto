import {
  parseStaticJsonlDefinition,
  parseStaticJsonlConfinement,
} from '../../../../src/logic/boundary/static-jsonl-table/definition.js';

for (const [index, input] of [
  { source: 'a', columns: ['x'] },
  { source: ' a ', columns: [' '] },
  { source: '../a', columns: ['x'] },
  { source: 'a', columns: new Array(1) },
  Object.assign([], { source: 'a', columns: ['x'] }),
  Object.assign(new Date(0), { source: 'a', columns: ['x'] }),
  Object.assign(Object.create(null), { source: 'a', columns: ['x'] }),
  Object.create({ source: 'a', columns: ['x'] }),
].entries()) {
  test(`retains accepted raw descriptor reference ${index}`, () => {
    expect(parseStaticJsonlDefinition(input)).toEqual({
      ok: true,
      evidence: input,
    });
    expect(parseStaticJsonlDefinition(input).evidence).toBe(input);
    expect(new parseStaticJsonlDefinition(input).evidence).toBe(input);
  });
}
for (const [index, input, message] of [
  [0, null, 'entry must be an object'],
  [1, undefined, 'entry must be an object'],
  [2, false, 'entry must be an object'],
  [3, 2, 'entry must be an object'],
  [4, () => {}, 'entry must be an object'],
  [5, {}, 'source must be a non-empty string'],
  [6, { source: '' }, 'source must be a non-empty string'],
  [7, { source: ' ' }, 'source must be a non-empty string'],
  [8, { source: 'a' }, 'columns must be a non-empty array'],
  [9, { source: 'a', columns: [] }, 'columns must be a non-empty array'],
  [
    10,
    { source: 'a', columns: [''] },
    'columns must contain non-empty strings',
  ],
  [11, { source: 'a', columns: [2] }, 'columns must contain non-empty strings'],
  [12, { source: 'a', columns: ['x', 'x'] }, 'columns must be unique'],
  [13, { source: 'a', columns: new Array(2) }, 'columns must be unique'],
]) {
  test(`retains descriptor failure category ${index}`, () => {
    const parsed = parseStaticJsonlDefinition(input);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toBeInstanceOf(TypeError);
    expect(parsed.error.message).toBe(`Invalid static JSONL table: ${message}`);
  });
}
for (const failure of [
  undefined,
  Symbol('failure'),
  new RangeError('source sentinel'),
]) {
  test(`captures original descriptor getter failure ${String(failure)}`, () => {
    const input = {
      get source() {
        throw failure;
      },
    };
    expect(parseStaticJsonlDefinition(input)).toEqual({
      ok: false,
      error: failure,
    });
  });
}
test('preserves repeated getters rather than claiming stable accepted slots', () => {
  const trace = [];
  const input = {
    get source() {
      trace.push('source');
      return 'a';
    },
    get columns() {
      trace.push('columns');
      return ['x'];
    },
  };
  const parsed = parseStaticJsonlDefinition(input);
  expect(parsed.evidence).toBe(input);
  expect(trace).toEqual([
    'source',
    'source',
    'columns',
    'columns',
    'columns',
    'columns',
    'columns',
  ]);
});
for (const [index, absolute] of [
  true,
  1,
  'yes',
  {},
  [],
  Symbol('absolute'),
].entries()) {
  test(`preserves truthy pure path decisions ${index} before reading source`, () => {
    const input = {
      get source() {
        throw new Error('must not read');
      },
    };
    const parsed = parseStaticJsonlConfinement(input, () => absolute);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.message).toBe(
      'Invalid static JSONL table: source must stay inside the static data directory'
    );
  });
}
for (const [index, absolute] of [
  false,
  0,
  NaN,
  '',
  null,
  undefined,
].entries()) {
  test(`preserves falsey pure path decisions ${index}`, () => {
    const input = { source: 'safe/path.jsonl' };
    expect(parseStaticJsonlConfinement(input, () => absolute)).toEqual({
      ok: true,
      evidence: input,
    });
  });
}
for (const source of ['../x', 'x/../y', 'x\\..\\y', '..']) {
  test(`retains segment confinement for ${source}`, () => {
    const parsed = parseStaticJsonlConfinement({ source }, () => false);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.message).toBe(
      'Invalid static JSONL table: source must stay inside the static data directory'
    );
  });
}
test('calls the pure decision before the single source read and permits repeated/new calls', () => {
  const trace = [];
  const input = {
    get source() {
      trace.push('source');
      return 'a..b';
    },
  };
  const absolute = () => {
    trace.push('absolute');
    return false;
  };
  expect(parseStaticJsonlConfinement(input, absolute).evidence).toBe(input);
  expect(new parseStaticJsonlConfinement(input, absolute).evidence).toBe(input);
  expect(trace).toEqual(['absolute', 'source', 'absolute', 'source']);
});
test('retains pure-decision and subsequent source-read failure identities', () => {
  const failure = new Error('path sentinel');
  expect(
    parseStaticJsonlConfinement({}, () => {
      throw failure;
    })
  ).toEqual({ ok: false, error: failure });
  const input = {
    get source() {
      throw failure;
    },
  };
  expect(parseStaticJsonlConfinement(input, () => false)).toEqual({
    ok: false,
    error: failure,
  });
});
