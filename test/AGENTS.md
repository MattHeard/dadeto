# AGENTS Instructions for test

## Scope
Applies to all files under `test/` (including fixtures, builders, and utilities).

## Test Strategy
- Favor focused unit tests for helper logic and small branches; keep integration tests for the main flow instead of stuffing every edge case into one large suite.
- Export pure helpers from source modules (clearly marked as test-only) when needed to reach tricky branches without inflating integration scaffolding.
- Reuse shared fixture builders for complex object graphs (e.g., Firestore-style doc/collection chains); create factories once and extend them instead of re-rolling mocks per test.
- Sketch complex data relationships before coding (options → variants → pages → stories) so mocks preserve parent/child links and ordering.
- When mocking external service chains, stub the minimal method chain you need (doc/collection/orderBy, etc.) and centralize it in a helper to avoid inconsistencies across suites.

## Workflow & Tooling
- Iterate in small steps: after each refactor or new helper, run targeted suites and `npm run lint` to catch regressions early; record any flags you used in PR notes.
- If Watchman errors appear, rerun Jest with `--watchman=false` to keep focused runs unblocked.
- Use Jest’s coverage output and ESLint’s JSON mode to spot untested or complex branches before widening test scope.
