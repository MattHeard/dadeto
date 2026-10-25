# AlgZoo scorer/audit boundary coverage

- Hurdle: Rank 3 was parked for external pilot gates, but fresh Full Check
  40181690898 still identified five missing paths in the local scorer/audit code.
- Diagnosis: compare the exact uncovered paths with the public paired-runner
  and ledger-status adapters. Missing cases were malformed scorer responses,
  non-record scores, boolean metric handling, fallback status, and missing
  dependencies. The status suite also lacked terminal-session counting.
- Fix: add synthetic boundary regressions proving scorer failures are redacted,
  allowlisted finite metrics and false booleans survive, unknown/private data
  does not reach audit records, and dependency failures occur before effects.
  Exercise all four terminal-session types and missing/malformed session IDs.
- Evidence: 42 tests pass across two suites; both source modules have 100%
  statements, branches, functions and lines. Artifact:
  /tmp/algzoo-score-boundary-coverage/coverage-final.json. Local npm run check
  passed with the two selected tests and all 10 static gates, zero clones;
  npm run build passed (/tmp/dadeto-algzoo-score-boundary-build.log), and
  git diff --check passed. No application code or coverage exclusions changed.
- Workspace lesson: node_modules is a symlink here, so the directory-only
  node_modules/ ignore did not cover it. The impact planner treated that path
  as unsafe and always fell back to all unit tests. A local .git/info/exclude
  entry for /node_modules restored the intended two-file selection. This
  excludes generated dependencies from Git metadata, not source from testing.
- Remaining gates: no Docker/Podman executable is on PATH and no independently
  verified Pi isolation, external audit anchor, or live canary evidence is
  available. No Codex invocation, credentials, inference, held-out evaluation,
  scientific pilot, or spend occurred. Do not treat these synthetic tests as
  proof of prelaunch isolation or experimental results.
