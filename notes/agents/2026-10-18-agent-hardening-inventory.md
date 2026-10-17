# Agent hardening requirements inventory (2026-10-18)

## Loop contract and result

Hypothesis: a source-backed inventory of the five requirement groups identifies completed work, existing foundations, and the next bounded loop without duplicating behavior already implemented.

Acceptance: record source/artifact evidence for sections A–E, choose one next slice, refresh the Rank 4 Notion page, pass `npm run check` and `git diff --check`, then close bead `dadeto-azuh`.

## Inventory

| Section | Current state | Evidence and remaining gap |
| --- | --- | --- |
| A. Change-aware, cheap-first validation | Partial | `package.json` has `check` and fail-fast `check:fast`; there is no changed-file/diff-range diagnostic command. `src/local/run-check.js` sets the default aggregate timeout to 30 minutes via `DADETO_CHECK_TIMEOUT_MS`. `src/core/index.js` emits check-start, child output, failures, and terminal summary events, but no periodic heartbeat for a silent long-running child. `scripts/run-jest-with-coverage.js` runs coverage shards serially, default size 40, with a 1024 MiB worker heap; `docs/quality/jest-pool.md` documents the shared serial Jest slot. The timeout/shard controls exist, while the requested scoped impact mapping and branch/clone/parse actionable report do not. |
| B. Per-task reuse-friction telemetry | Partial | `docs/loop/agent-reuse-notes.md` defines the append-only v1 JSONL contract and safe unknown/empty values; `docs/loop/agent-invocation.md` asks for source-grounded records for completed toys/features. `src/core/local/agentReuseReport.js` validates schema and aggregates latest friction by task ID. It does not accept an eligible completed-task list, report eligible completions missing records, verify source-note evidence, or report eligibility as unknown. `notes/agents/reuse-events.jsonl` contains one event; this count does not establish the eligible-task denominator. |
| C. Generated-artifact-aware clean-checkout tests | Partial | The 13 files under `test/infra/` and `test/scripts/gcp-test-workflow.test.js` read checked-in Terraform/workflow/config sources and are source-contract tests. `test/cloud-functions/renderContentsHtmlSnippets.test.js` reads source modules under `src/browser/`; `test/core/copy.test.js`, `test/core/copyCloud.test.js`, and `test/core/dendrite.test.js` exercise injected copy/filesystem behavior rather than built output. Most `test/generator/` tests assert generated strings in memory. One generated-output dependency is `test/core/browser/game/neonCovenant.test.js`, which reads tracked `src/build/blog.json` without invoking artifact regeneration in `test:unit`; `scripts/sync-blog-manuals.js` is the writer for that artifact. `.github/workflows/check.yml` checks out a clean repository, runs `npm ci`, installs Playwright, then runs `npm run check`; the unit test command itself does not build first. By contrast, `.github/workflows/terraform-validate.yml` explicitly runs `npm run build:cloud` before Terraform validation, and local E2E uses `npm run build`. No clean-checkout negative/positive fixtures were found for missing generated output or broken copy mappings. |
| D. Shared optional schema-test contract | Implemented for the contracted Zod slice | `src/core/interpretability/testZod.js` supplies the optional loader and shared fallback; `test/core/interpretability/testZodContract.test.js` checks the contracted Zod behavior. The installed and forced-fallback runs passed 34/34 each, including proof that `DADETO_TEST_WITHOUT_ZOD=1` selected the fallback. Durable details are in `notes/agents/2026-10-17-optional-zod-schema-parity.md`; bead `dadeto-kzm8` is closed. This does not imply sections A–C or E are complete. |
| E. Canonical registry lineage and deployment evidence | Partial; live evidence waits on dependencies/authorization | Rank 2 already supplies Terraform registry resources, parser/consumer tests, and a separate plan scope. Plan-only run [39079198819](https://github.com/MattHeard/dadeto/actions/runs/39079198819) proposed exactly three creates (registry bucket, public object-reader binding, manifest object); no apply ran. Production publication, generation/digest capture, association to a Netlify build, and independent endpoint health evidence are absent. Apply approval is still pending for Rank 2. Rank 1/3 production evidence remains independently gated as recorded in their specs. |

## Next bounded slice

After the higher-ranked unfinished specs (Ranks 1–3) are handled as far as their production gates allow, resume this spec with Section A: add a deterministic changed-file/diff-range impact planner and regression tests for exact related-test selection plus conservative fallback on ambiguous paths. Keep global `npm run check` authoritative. This is the smallest concrete starting point for the missing scoped diagnostic; it does not claim the full A acceptance or replace later branch/clone/parse diagnostics.

## Evidence boundaries

The test inventory distinguishes checked-in source contracts from generated-output checks; filenames containing `generated` alone were not treated as proof of an artifact dependency. Production apply and smoke evidence are not claimed because the relevant authorizations or GCP access are not present. The repository remains dependent on the Rank 2 canonical registry rollout before Section E can be completed.

## Evaluation

- `DADETO_CHECK_TIMEOUT_MS=7200000 TMPDIR=/home/matt/dadeto/.tmp DADETO_COVERAGE_SHARD_SIZE=40 DADETO_COVERAGE_WORKER_HEAP_MB=1024 DADETO_JEST_POOL_DIR=/home/matt/dadeto/.tmp/jest-pool-rank4 DADETO_COVERAGE_DIR=/home/matt/dadeto/.tmp/coverage-rank4 npm run check` — passed, exit 0. All test shards and 11/11 local E2E tests passed; all 10 static gates passed; line, statement, function, and branch coverage were each 100%; duplication reported 0 clones. Coverage artifact: `reports/coverage/coverage-summary.json`.
- `git diff --check` — passed after the inventory update.
