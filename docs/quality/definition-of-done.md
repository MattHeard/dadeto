# Quality Definition of Done

This document defines the minimum quality bar for closing a change.
Pair it with `docs/quality/evaluator-matrix.md` to select and run required evaluators.

## Minimum global requirements per change

Every change (code, docs, config, or infra) is done only when all of the following are true:

1. **Scope is bounded and explicit** (what changed and why).
2. **Required evaluators are executed** for impacted subsystems.
3. **`npm run check` passes locally** (or failure is explicitly escalated with an owning `bd` bead). This is the fast local aggregate gate: static checks plus impact-selected Jest tests without coverage.
4. **Evidence is recorded** (exact command + outcome + artifact paths where applicable).
5. **No untracked quality debt is introduced**; unresolved issues are tracked in `bd` before closure.
6. **Branch is landed** (pull/rebase, sync, push, verify up-to-date status).

The asynchronous `check:full` workflow is the authoritative result for the complete unit suite, global coverage thresholds, and E2E. Continue implementation after a fast local pass while that workflow runs, but do not describe the local result as full-suite or coverage evidence. Record the full workflow result separately.

## Cheap-first evaluation order

Run fast local checks first, then expensive/cloud checks:

Use `npm run check` for the default fast local gate. It runs `npm run test:impact` without coverage, then the existing static gates, and streams structured failure and three-second progress events to stderr. The impact runner checks staged, unstaged, untracked, and optional base-ref changes. It uses Jest related-test discovery for source changes, direct execution for changed unit-test files, and falls back to all unit tests without coverage in serial process shards when discovery fails or paths are unsupported. A clean tree reports that no tests were selected. The default impact shard size is 200 test files (`DADETO_CHECK_IMPACT_SHARD_SIZE`); the progress interval can be tuned with `DADETO_CHECK_PROGRESS_INTERVAL_MS`.

Use `npm run check:fast` when you want the fast local gate to stop on the first failure instead of collecting all failures.

Use `npm run check:full` for the complete existing behavior: `npm test` (all unit tests with coverage thresholds, then E2E) plus every static gate. GitHub Actions runs this for pull requests and updates to `main`, with a 120-minute job timeout and a downloadable coverage report.

Use `npm run test:impact -- --files <paths...>` for a reproducible test-only run. Add `-- --base <git-ref>` to include changes relative to a selected branch; `DADETO_CHECK_BASE` supplies the default base. `npm run check:impact` prints a plan only and does not execute tests.

Use `npm run check:impact:run -- --files <paths...>` for selected unit tests plus changed-file ESLint. For changed `src/core` files, Jest collects coverage only for the changed core files and reports uncovered lines and branch arms; the command also runs `core-parse` and the full `src/core` duplication scan (`npm run duplication`). Clone failures print up to five file/line pairs and the full JSON report path. Test-only runs and conservative all-unit fallback stay without coverage. This diagnostic command does not prove global coverage or replace `npm run check:full`.

Use `npm run check -- --skip-tests` when impact tests have already been handled separately and only the local static gates are needed.

Keep subsystem-specific packaging commands such as `npm run build:cloud` and `npm run build:dendritestories-co-nz` separate from the default aggregate gate.

1. `npm run check`
2. `npm run lint`
3. `npm run build` (when build-relevant paths changed)
4. subsystem checks (for example `npm run build:cloud`, `npm run build:dendritestories-co-nz`, `npm run duplication`, `npm run non-core-thin`)
5. the asynchronous `check:full` Actions result for complete suite, coverage, and E2E evidence

Rationale: fail early on fast feedback, reserve cloud and long-running jobs for changes that pass local gates.

## Subsystem-specific mandatory checks

Use the evaluator matrix as source of truth. At minimum:

- **All changes:** `npm run check`
- **Full suite, global coverage, and E2E evidence:** `npm run check:full` in GitHub Actions
- **JS/TS/CSS/MD/tooling changes:** `npm run lint`
- **Build/output pipeline changes:** `npm run build`
- **Cloud runtime/deploy packaging changes:** `npm run build:cloud`
- **Dendrite package/public path changes:** `npm run build:dendritestories-co-nz`
- **Shared-module refactors with architecture risk:** `npm run duplication`
- **Non-core JS changes:** `npm run non-core-thin`
- **E2E-covered release surfaces:** `npm run test:e2e`

## Core-first architecture gates

Business logic should live under `src/core`. Code outside `src/core` should stay thin: environment integration, dependency wiring, and generated-entry shims. The aggregate check enforces this direction in three ways:

- `npm run lint` treats warnings as failures for the linted surface, so core quality rules are strict.
- `npm run duplication` keeps zero-duplication detection across legacy `src/core` and both target logic roots (`src/logic/core`, `src/logic/boundary`) and fails the gate on any reported clone, even if the underlying scanner exits 0.
- `npm run non-core-thin` fails any non-core JavaScript file over 50 lines unless it is explicitly listed in `non-core-thin-exemptions.json`.
- `npm run non-core-thin` also fails wrapper-shape violations for `src/cloud/**/index.js`, `src/browser/**`, `src/build/**`, and `src/local/**`: each checked wrapper should declare `const handle = coreFactory(...)` and either export or invoke `handle`.

The exemption file should normally stay empty; if a temporary exception is added, remove it as soon as the logic moves into `src/core`.

## E2E cloud-only constraint

Playwright E2E is split into:

- `npm run test:e2e` for all Playwright coverage.
- `npm run test:e2e:cloud` for Cloud Run / Google Cloud services.
- `npm run test:e2e:local` for local server behavior that should not run in GCP.

Local loops should rely on unit/integration checks unless explicitly instructed otherwise, and the cloud workflow should only invoke the cloud suite.

Reference workflow: `.github/workflows/gcp-test.yml` (Cloud Run Job execution + e2e artifact upload).

## Evidence retention expectations

### In PR descriptions

Include:

- **Summary** of user-visible and loop-value artifacts.
- **Testing** section with exact commands and outcomes.
- **Artifact pointers** (for example coverage/build reports, CI artifact names, workflow links).

### In issue (`bd`) comments

Include:

- exact command run,
- pass/fail result,
- key failing/passing output snippet,
- artifact paths and/or CI workflow URL,
- next action/owner when unresolved.

A change is not done if evidence exists only in terminal history and is not retained in PR/issue records.
