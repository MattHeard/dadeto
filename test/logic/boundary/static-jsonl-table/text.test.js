import { parseStaticJsonlText } from '../../../../src/logic/boundary/static-jsonl-table/text.js';

for (const [index, value] of [
  undefined,
  null,
  false,
  true,
  '',
  '<&>"',
  0,
  -0,
  NaN,
  Infinity,
  1n,
  Symbol('text'),
  [],
  {},
  Object.prototype,
].entries()) {
  test(`retains native String interpretation ${index}: ${String(value)}`, () => {
    expect(parseStaticJsonlText(value)).toEqual({
      ok: true,
      evidence: String(value),
    });
  });
}
test('uses the native string hint exactly once and allows repeated/new calls', () => {
  const trace = [];
  const value = {
    [Symbol.toPrimitive](hint) {
      trace.push(hint);
      return '<value>';
    },
  };
  expect(parseStaticJsonlText(value)).toEqual({
    ok: true,
    evidence: '<value>',
  });
  expect(new parseStaticJsonlText(value)).toEqual({
    ok: true,
    evidence: '<value>',
  });
  expect(trace).toEqual(['string', 'string']);
});
for (const failure of [
  undefined,
  Symbol('failure'),
  new RangeError('coercion sentinel'),
]) {
  test(`captures native coercion failure identity ${String(failure)}`, () => {
    const value = {
      toString() {
        throw failure;
      },
    };
    expect(parseStaticJsonlText(value)).toEqual({ ok: false, error: failure });
  });
}
