# Shared static table ordering

Build and browser static JSONL tables now use `tableCore.js` for cell ordering.
The build's `compareValues` export is retained. Its absent/unknown type policy
stays lexical; the browser explicitly supplies each column's inferred type.
Numeric subtraction and text relational ordering preserve stable sort behavior.

The core classifier interprets returned ternaries as parsing and negative
literal branch returns as validation (positive literal returns are numeric
control). Inspection of classifier signals led to strategy lookup and lexical
ordering expressed as the difference of numeric greater-than indicators. No
gate changes, exclusions, exemptions or ignore pragmas were introduced.

Final evidence: 19 tests / three suites pass; the shared comparator and both
consumers have exact 100% coverage on all four metrics (`.tmp/table-order-tests.log`,
`.tmp/table-comparator-coverage`). Static aggregate passes nine gates and fails
duplication alone at 126 clones, down from 127 (`.tmp/table-order-static.log`).
New regression verifies numeric versus lexical order, ties, mixed numeric input,
unknown type fallback and the compatibility export.

Preceding full checkpoint `91287cdca4`: tests/browser checks passed, global
coverage exactly 100% (19923 lines, 20723 statements, 6887 functions, 9794
branches); outer static summary failed only duplication at 127
(`.tmp/feasibility-checkpoint-full.log`). This does not prove the final goal;
zero clones and a new completely green full check remain required.
