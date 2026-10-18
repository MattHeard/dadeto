# Changed-file check impact planner

## Loop outcome

Added `npm run check:impact` to print a deterministic Jest, ESLint, and core-parse diagnostic plan for supported changed JavaScript and unit-test paths. The command accepts explicit paths or a Git diff range. It uses Jest related-test discovery for source files, quotes generated shell paths, and chooses `npm run check` whenever a path is unsupported or discovery fails. Scoped diagnostics never replace the full check.

The local CLI wrapper passes a startup `allow effects` permission to the injected process and output adapters. The planner core normalizes paths, sorts and deduplicates its inputs, classifies source and test changes, and emits the selected checks as JSON.

## Hurdle and diagnosis

The first focused Jest invocation stalled without output after acquiring the shared pool slot. The first full check then exposed an implicit Jest global, a non-core command that violated the thin-wrapper rule, and two lint warnings. After moving orchestration into a permission-aware core handle, the next full check found an untyped discovered-test list in `tsdoc:check`.

## Fix and evidence

Tests cover normalized and unsafe paths, related-test success and failure, direct test changes, Git ranges, shell quoting, and required effect permissions. The local wrapper stays under the 50-line non-core limit.

- `DADETO_CHECK_TIMEOUT_MS=7200000 TMPDIR=/home/matt/dadeto/.tmp DADETO_COVERAGE_SHARD_SIZE=40 DADETO_COVERAGE_WORKER_HEAP_MB=1024 DADETO_JEST_POOL_DIR=/home/matt/dadeto/.tmp/jest-pool-rank4 DADETO_COVERAGE_DIR=/home/matt/dadeto/.tmp/coverage-rank4 npm run check` — passed, exit 0; all 10 static gates passed, all test shards and 11/11 local E2E tests passed, and duplication reported 0 clones.
- Coverage artifact: `reports/coverage/coverage-summary.json` — lines, statements, functions, and branches at 100%, with 0 skipped.
- `git diff --check` — passed.

## Next guidance

Use `npm run check:impact -- --base origin/main` or pass `--files` followed by changed paths. Treat its output as a diagnostic plan; always run `npm run check` before closing a loop. Rank 4 remains partial: reuse-friction telemetry, generated-artifact clean-checkout cases, deployment evidence, and broader branch/clone/parse diagnostics still need work. The next queue item is Rank 1, the `get-author-uuid-v2` publication spec, whose production apply is gated on approval for its full resource plan.
