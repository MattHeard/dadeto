import { parseStaticJsonlLine } from '../src/logic/boundary/static-jsonl-table/record.js';

const parsed = parseStaticJsonlLine('{"a":2}', 0);
// @ts-expect-error Physical line index is required.
parseStaticJsonlLine('{}');
// @ts-expect-error Physical line index is numeric.
parseStaticJsonlLine('{}', '0');
// @ts-expect-error Evidence is unavailable until failure has been handled.
parsed.evidence;
if (parsed.ok) {
  // @ts-expect-error Blank lines do not carry records.
  parsed.evidence.record;
  if (parsed.evidence.kind === 'record') {
    // @ts-expect-error JSON field acceptance is separate from scalar cell acceptance.
    const cell: string = parsed.evidence.record.a;
    void cell;
  }
}
