# Agent reuse eligibility coverage report — 2026-10-19

- Hypothesis: the existing report needed an authoritative eligible-task list to
  identify missing reuse events, while keeping eligibility unknown when no
  inventory is supplied.
- Unexpected hurdle: the first `npm run check` found that the expanded
  `src/local/agentReuseReport.js` entry point had 71 lines, above the 50-line
  non-core limit.
- Diagnosis: `npm run non-core-thin` identified the local CLI as the only
  violation. The local argument parser was the added bulk.
- Fix: moved argument parsing into the existing core-local report module,
  covered the success and error cases, and kept the local entry point as a thin
  filesystem adapter. The rerun of `npm run non-core-thin` passed.
- Environment hurdle: the first focused test attempt could not create its
  default Jest lock under `/tmp` in the read-only sandbox. Setting
  `DADETO_JEST_POOL_DIR=/tmp/codex-dadeto-jest-pool` on the approved check
  commands let the runner proceed.
- Behavior: a JSON array of unique task IDs is accepted through
  `--eligible-tasks`; reports compare against the latest event, count
  superseded records and missing eligible events, and check source-note
  existence through an injected lookup. Without an inventory, eligibility and
  eligible source-note coverage say `unknown`.
- Evidence: focused `npm run test:impact -- --files
  test/core/local/agentReuseReport.test.js` passed (1 suite, 19 tests). The
  end-to-end `npm run agents:reuse-report -- --eligible-tasks
  /tmp/dadeto-eligible-tasks.json` run reported one known and one missing
  eligible task, with the source note found. `npm run check` passed all 10
  gates, including 955 suites / 6,534 tests, zero clones, and zero audit
  vulnerabilities. This fast local check does not measure global coverage.
- Next: use only a source-backed completed-task inventory for eligibility; in
  its absence, keep the report's coverage denominator explicitly unknown.
