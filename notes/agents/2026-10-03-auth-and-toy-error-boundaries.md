# Authentication absence and toy-error serialization

The strict clone report identified browser UUID fetching and cloud token
verification duplicating their asynchronous rejection-to-null boundary.
`resolveOrNull` now owns that behavior in the cross-environment shared core.
Callers start their operations before entering it: synchronous verifier throws
still throw, and the async fetch API still rejects on synchronous fetch throws.
Tests explicitly distinguish these cases from network, JSON, and mapper errors.
The touched auth mutation suppressions were removed rather than replaced.

Legacy fulfillment errors now use the common toy validation-error formatter
with zero indentation. The default remains two spaces for existing toys.
Missing and non-string messages retain their original JSON serialization;
do not coerce legacy thrown values merely to satisfy a narrower JSDoc type.

Evidence:

- Auth/core: 61 tests in five suites pass, exact 100% across all four metrics
  for `index`, `auth-helpers`, and `google-auth-cache`.
  `.tmp/auth-boundary-complete-tests.log`, `.tmp/auth-boundary-complete-coverage`.
- Toy formatting: 1,222 tests in 135 suites pass, exact 100% for both changed
  toy modules. `.tmp/toy-failure-format-tests.log`,
  `.tmp/toy-failure-format-coverage`.
- `npm run build` and `npm run build:cloud` pass, including generated shared
  infrastructure code. `.tmp/auth-boundary-build.log`,
  `.tmp/auth-boundary-cloud-build.log`.
- Final static aggregate: eight gates pass; duplication finds 121 clones at
  unchanged strict `minTokens: 14`, and audit reports a new high-severity
  `braces` advisory. `.tmp/toy-failure-format-final-static.log`.

The audit advisory is GHSA-vfj7-8cjw-p6xm; no compatible patched braces release
was available. An isolated jscpd 5.4 comparison found 384 clones but only 12
legacy file pairs overlapped, so that scanner was not silently substituted.
Comparison artifacts: `.tmp/clone-goal-audit.json`,
`.tmp/jscpd5-comparison.log`, `.tmp/jscpd5-report`.
Investigate retaining the original 4.0.1 core/tokenizer while replacing its
vulnerable glob-based file finder with repository-owned enumeration, and prove
detector equivalence before removing the old CLI dependency. Neither advisory
ignores nor scanner baseline exemptions are acceptable.
