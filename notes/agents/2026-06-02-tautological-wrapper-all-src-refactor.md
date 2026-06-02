## Tautological Wrapper Rule Widening

Unexpected hurdle: widening the rule to all of `src` surfaced a much wider mix of helper patterns than the original entrypoint-only scope, including a duplication clone in `hiLoCardGame` and several JSDoc/type drift issues.

Diagnosis path: I grouped the warnings by file, removed the true pass-through helpers first, then reran lint to expose the remaining documentation and typing fallout. The remaining type errors were concentrated in `realHourlyWage`, `hiLoCardGame`, `joyConMapper`, and `ledger-ingest/core`.

Chosen fix: replace pure wrappers with direct utilities or direct exports, keep the public test hooks as aliases to real helpers, and prefer shared helpers like `normalizeObjectOrFallback` when the code was duplicating browser-core logic.

Next-time guidance: when broadening a repo-wide lint rule, run lint, tsdoc, and duplication together early. That catches both wrapper cleanup and the “same logic, slightly different file” cases before they turn into a longer refactor loop.
