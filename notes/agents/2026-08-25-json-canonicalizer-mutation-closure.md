# JSON Canonicalizer mutation closure

The final authoritative scan for `src/core/browser/toys/2026-07-04/jsonCanonicalizer.js` instrumented 28 mutants: 14 killed, 14 ignored by documented Stryker defensive-boundary directives, 0 non-static survivors, and 0 timeouts.

The mutation-induced failure mode was recursive canonicalization when an object predicate was forced true for scalar values. A termination guard now makes defensive calls bounded. Focused verification passed 3 tests. `npm run check` was also run; the repository continues to report the known sandbox EPERM plus audit, lint, and duplication failures.
