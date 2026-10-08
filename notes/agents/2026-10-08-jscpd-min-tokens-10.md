# jscpd minimum tokens 10

Lowering the clone threshold from 11 to 10 exposed short repeated patterns in
browser/game presenters, cloud adapters, gate scripts and TUI rendering. The
JSON report was the useful work queue: repeated caches, input-element creation,
rectangle payloads, error handling and renderer projections had small shared
helpers or clearer call boundaries. No source exclusions were added.

Two compatibility details surfaced during aggregate validation. Keep
`createRectShape`'s object argument stable for toy persistence consumers; the
Mosslight renderer now uses a tuple-based companion helper. The ledger-ingest
test-only helper remains exposed and needs a direct test even though runtime
code no longer calls it. Coverage also found an unreachable duplicate status
store type check; the existing capability check is now a type predicate.

Evidence:

- `npm run duplication`: 0 clones at `minTokens: 10`.
- `JEST_CACHE_DIRECTORY=/home/matt/dadeto/.jest-cache TMPDIR=/home/matt/dadeto/.tmp DADETO_COVERAGE_SHARD_SIZE=40 npm run check`: terminal `check-summary` passed, 10/10 gates; wrapper exited 0. Coverage summary reports 100% lines, statements, functions and branches (`reports/coverage/coverage-summary.json`; captured output in `/tmp/dadeto-npm-check-final-3-2026-10-08.log`).

Next time, retain object-shaped exported APIs when extracting a renderer helper,
and inspect the exact uncovered coverage entry when a strict percentage gate
misses by one count.
