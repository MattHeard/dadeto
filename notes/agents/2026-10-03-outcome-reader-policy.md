# Optional outcome-store reader

The strict report paired the Notion outcome reader's null guard with Symphony
status projection. The reader now delegates lazy selection to `whenOrNull`.
Keep the selected call as a property call: detaching the method loses its receiver,
and caching the guarded property changes its two getter reads. The focused suite
asserts those invariants and exact error identity for getter and method failures,
with no state writes or launches after either failure.

The first static run exposed callback narrowing errors. A JSDoc assertion records
the predicate's guarantee without adding a second runtime guard or fallback.
The corrected run has duplication as its only failure: 68 to 67 clones at unchanged
strict minTokens 14. Focused tests: `.tmp/outcome-reader-tests.log`, 25 passing,
exact 100% for all four poll metrics. Static: `.tmp/outcome-reader-static.log`.
Packaging: `.tmp/outcome-reader-build.log`, passed. dadeto-aaou remains open.
