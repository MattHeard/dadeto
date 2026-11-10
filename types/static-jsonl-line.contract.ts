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

import { parseStaticJsonlCell } from '../src/logic/boundary/static-jsonl-table/cell.js';
import { parseStaticJsonlText } from '../src/logic/boundary/static-jsonl-table/text.js';
import {
  escapeStaticJsonlAttribute,
  escapeStaticJsonlText,
} from '../src/logic/core/static-jsonl-table/escaping.js';

const cell = parseStaticJsonlCell({ a: 2 }, 'a', 0);
// @ts-expect-error Column keys are authored strings.
parseStaticJsonlCell({}, 2, 0);
// @ts-expect-error Trusted attribute escaping does not accept raw numeric values.
escapeStaticJsonlAttribute(2);
// @ts-expect-error Trusted text escaping does not accept opaque input.
escapeStaticJsonlText({});
if (cell.ok) {
  // @ts-expect-error Accepted numeric cells still require text interpretation.
  escapeStaticJsonlText(cell.evidence);
  const text = parseStaticJsonlText(cell.evidence);
  if (text.ok) escapeStaticJsonlText(text.evidence);
  // @ts-expect-error Raw text evidence requires explicit error handling.
  escapeStaticJsonlText(text.evidence);
}
