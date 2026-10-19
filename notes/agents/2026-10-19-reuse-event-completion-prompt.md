# Reuse-event completion prompt — 2026-10-19

- Unexpected hurdle: the schema guide and invocation heuristics existed, but
  `AGENTS.md` did not direct agents to the reuse-event protocol at task
  completion, and the completion guidance did not make evidence-only fields
  explicit.
- Diagnosis: searched the repository router, invocation protocol, schema guide,
  and current reuse JSONL. The guide already permits empty arrays and unknown
  estimates; three current records pass the report, so no new reuse claim was
  needed.
- Chosen fix: added a short `AGENTS.md` route to the canonical schema guide and
  an explicit source-backed completion prompt to
  `docs/loop/agent-invocation.md`. Both say this is for meaningful toy/feature
  completions, not every commit, and forbid invented reuse, rejected attempts,
  or estimates.
- Evidence: `npm run agents:reuse-report` reports 3 latest valid events, 0
  superseded records, and eligibility `unknown` without an authoritative task
  inventory. The elevated
  `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 DADETO_JEST_POOL_DIR=.tmp/jest-pool-rank2 npm run check`
  passed all 10 gates; its conservative five-shard fallback ran 960 suites / 6,602 tests,
  with 0 duplication clones and 0 audit vulnerabilities. `git diff --check`
  passed.
- Next-time guidance: keep the JSONL schema and field semantics in
  `docs/loop/agent-reuse-notes.md`; task-completion docs should route to it and
  prompt for evidence without duplicating the schema or requiring a record for
  every commit.
