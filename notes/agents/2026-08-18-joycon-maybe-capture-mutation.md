# Joy-Con maybe-capture mutation coverage

- Unexpected hurdle: the capture gate had three survivors because tests covered the lower-level skip predicate but not the `maybeCapture` caller.
- Diagnosis: no test proved that idle state exits without changing the baseline or that active state forwards a normalized controller snapshot.
- Fix: added idle and active-path assertions around `maybeCapture`.
- Evidence: focused Jest passed 75/75; Stryker scan for lines 1776-1784 killed 3/3 mutants; targeted ESLint and diff check passed.
- Next-time guidance: test both a guard's caller-side no-op and its active handoff, not only the predicate implementation.
