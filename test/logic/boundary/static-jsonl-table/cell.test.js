import { parseStaticJsonlCell } from '../../../../src/logic/boundary/static-jsonl-table/cell.js';

for (const [index, cell] of [
  '',
  ' ',
  '<&>"',
  0,
  -0,
  -2,
  Number.MIN_VALUE,
  Number.MAX_VALUE,
].entries()) {
  test(`accepts own finite scalar ${index}: ${String(cell)}`, () => {
    const parsed = parseStaticJsonlCell({ a: cell }, 'a', 0);
    expect(parsed).toEqual({ ok: true, evidence: cell });
    expect(Object.is(parsed.evidence, cell)).toBe(true);
  });
}
for (const cell of [
  undefined,
  null,
  false,
  true,
  NaN,
  Infinity,
  -Infinity,
  {},
  [],
  1n,
  Symbol('cell'),
  () => 2,
]) {
  test(`rejects unsupported own cell ${String(cell)}`, () => {
    const parsed = parseStaticJsonlCell({ a: cell }, 'a', 4);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toBeInstanceOf(TypeError);
    expect(parsed.error.message).toBe(
      'Invalid static JSONL table: column a contains an unsupported value on line 5'
    );
  });
}
test('requires own cells and keeps the physical source line diagnostic', () => {
  const parsed = parseStaticJsonlCell(Object.create({ a: 2 }), 'a', 4);
  expect(parsed.ok).toBe(false);
  expect(parsed.error.message).toBe(
    'Invalid static JSONL table: line 5 is missing column a'
  );
});
test('accepts reserved own keys without invoking record methods', () => {
  const record = JSON.parse(
    '{"__proto__":2,"constructor":"ok","hasOwnProperty":3}'
  );
  expect(parseStaticJsonlCell(record, '__proto__', 0)).toEqual({
    ok: true,
    evidence: 2,
  });
  expect(parseStaticJsonlCell(record, 'constructor', 0)).toEqual({
    ok: true,
    evidence: 'ok',
  });
  expect(parseStaticJsonlCell(record, 'hasOwnProperty', 0)).toEqual({
    ok: true,
    evidence: 3,
  });
});
test('does not require an ordinary object constructor or factory-only invocation', () => {
  const record = Object.assign(new Date(0), { a: 2 });
  expect(new parseStaticJsonlCell(record, 'a', 0)).toEqual({
    ok: true,
    evidence: 2,
  });
  expect(
    parseStaticJsonlCell(Object.assign(Object.create(null), { a: 2 }), 'a', 0)
  ).toEqual({ ok: true, evidence: 2 });
});
for (const failure of [
  undefined,
  Symbol('failure'),
  new RangeError('getter sentinel'),
]) {
  test(`preserves getter failure identity ${String(failure)}`, () => {
    const record = {
      get a() {
        throw failure;
      },
    };
    expect(parseStaticJsonlCell(record, 'a', 0)).toEqual({
      ok: false,
      error: failure,
    });
  });
}
test('checks own presence before reading the value exactly once', () => {
  const trace = [];
  const record = new Proxy(
    { a: 2 },
    {
      getOwnPropertyDescriptor(target, key) {
        trace.push(['own', key]);
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
      get(target, key) {
        trace.push(['get', key]);
        return Reflect.get(target, key);
      },
    }
  );
  expect(parseStaticJsonlCell(record, 'a', 0)).toEqual({
    ok: true,
    evidence: 2,
  });
  expect(trace).toEqual([
    ['own', 'a'],
    ['get', 'a'],
  ]);
});
test('captures own-property failure before any cell read', () => {
  const failure = new Error('own sentinel');
  const record = new Proxy(
    {},
    {
      getOwnPropertyDescriptor() {
        throw failure;
      },
    }
  );
  expect(parseStaticJsonlCell(record, 'a', 0)).toEqual({
    ok: false,
    error: failure,
  });
  expect(parseStaticJsonlCell(null, 'a', 0).ok).toBe(false);
});
