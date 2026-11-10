import { parseStaticJsonlLine } from '../../../../src/logic/boundary/static-jsonl-table/record.js';

for (const line of ['', ' ', '\t', '\r', ' \r\n']) {
  test(`accepts blank source line ${JSON.stringify(line)}`, () => {
    expect(parseStaticJsonlLine(line, 0)).toEqual({
      ok: true,
      evidence: { kind: 'blank' },
    });
  });
}
for (const line of [
  '{}',
  '{"a":2}',
  '{"a":null}',
  '{"a":1e400}',
  '{"__proto__":2}',
]) {
  test(`retains the native decoded object for ${line}`, () => {
    const parsed = parseStaticJsonlLine(line, 0);
    expect(parsed).toEqual({
      ok: true,
      evidence: { kind: 'record', record: JSON.parse(line) },
    });
    expect(Object.keys(parsed.evidence.record)).toEqual(
      Object.keys(JSON.parse(line))
    );
  });
}
for (const line of [
  'null',
  'false',
  'true',
  '0',
  '2',
  '"text"',
  '[]',
  '[{}]',
]) {
  test(`rejects non-record JSON ${line} at its physical source line`, () => {
    const parsed = parseStaticJsonlLine(line, 7);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toBeInstanceOf(TypeError);
    expect(parsed.error.message).toBe(
      'Invalid static JSONL table: line 8 must contain a JSON object'
    );
    expect(Object.hasOwn(parsed.error, 'cause')).toBe(false);
  });
}
for (const line of ['{', 'undefined', '{"a":}']) {
  test(`preserves JSON syntax failure as cause for ${line}`, () => {
    const parsed = parseStaticJsonlLine(line, 7);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.message).toBe(
      'Invalid static JSONL table: malformed JSON on line 8'
    );
    expect(parsed.error.cause).toBeInstanceOf(SyntaxError);
  });
}
for (const line of [undefined, null, false, 2, [], {}]) {
  test(`captures native trim failure for raw ${String(line)}`, () => {
    const parsed = parseStaticJsonlLine(line, 0);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toBeInstanceOf(TypeError);
  });
}
for (const thrown of [
  undefined,
  new RangeError('trim sentinel'),
  Symbol('trim sentinel'),
]) {
  test(`retains the original trim failure identity for ${String(thrown)}`, () => {
    const line = {
      get trim() {
        throw thrown;
      },
    };
    const parsed = parseStaticJsonlLine(line, 0);
    expect(parsed).toEqual({ ok: false, error: thrown });
    expect(parsed.error).toBe(thrown);
  });
}
test('retains JSON coercion failure identity in the original wrapped cause', () => {
  const thrown = new RangeError('decode sentinel');
  const line = {
    trim: () => 'nonblank',
    [Symbol.toPrimitive]() {
      throw thrown;
    },
  };
  const parsed = parseStaticJsonlLine(line, 3);
  expect(parsed.ok).toBe(false);
  expect(parsed.error.message).toBe(
    'Invalid static JSONL table: malformed JSON on line 4'
  );
  expect(parsed.error.cause).toBe(thrown);
});
