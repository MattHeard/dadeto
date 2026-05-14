# Quality Definition of Done

This document defines the minimum quality bar for closing a change.
Pair it with `docs/quality/evaluator-matrix.md` to select and run required evaluators.

## Minimum global requirements per change

Every change (code, docs, config, or infra) is done only when all of the following are true:

1. **Scope is bounded and explicit** (what changed and why).
2. **Required evaluators are executed** for impacted subsystems.
3. **`npm test` passes locally** (or failure is explicitly escalated with owning `bd` bead).
4. **Evidence is recorded** (exact command + outcome + artifact paths where applicable).
5. **No untracked quality debt is introduced**; unresolved issues are tracked in `bd` before closure.
6. **Branch is landed** (pull/rebase, sync, push, verify up-to-date status).

## Cheap-first evaluation order

Run fast local checks first, then expensive/cloud checks:

Use `npm run check` when you want the default local aggregate gate for most changes. It runs `npm test`, `npm run lint`, `npm run depcruise`, `npm run duplication`, `npm run non-core-thin`, and `npm audit --audit-level=low` without replacing any underlying subsystem-specific commands.

Keep subsystem-specific packaging commands such as `npm run build:cloud` and `npm run build:dendritestories-co-nz` separate, and keep `npm run tsdoc:check` out of the default aggregate path until the known typing backlog is intentionally being worked.

1. `npm test`
2. `npm run lint`
3. `npm run build` (when build-relevant paths changed)
4. subsystem checks (for example `npm run build:cloud`, `npm run build:dendritestories-co-nz`, `npm run duplication`, `npm run non-core-thin`)
5. cloud-gated E2E workflow checks

Rationale: fail early on fast feedback, reserve cloud and long-running jobs for changes that pass local gates.

## Subsystem-specific mandatory checks

Use the evaluator matrix as source of truth. At minimum:

- **All changes:** `npm test`
- **JS/TS/CSS/MD/tooling changes:** `npm run lint`
- **Build/output pipeline changes:** `npm run build`
- **Cloud runtime/deploy packaging changes:** `npm run build:cloud`
- **Dendrite package/public path changes:** `npm run build:dendritestories-co-nz`
- **Shared-module refactors with architecture risk:** `npm run duplication`
- **Non-core JS changes:** `npm run non-core-thin`
- **E2E-covered release surfaces:** cloud E2E workflow execution

## Core-first architecture gates

Business logic should live under `src/core`. Code outside `src/core` should stay thin: environment integration, dependency wiring, and generated-entry shims. The aggregate check enforces this direction in three ways:

- `npm run lint` treats warnings as failures for the linted surface, so core quality rules are strict.
- `npm run duplication` keeps zero-duplication detection scoped to `src/core`.
- `npm run non-core-thin` fails any non-core JavaScript file over 50 lines unless it is explicitly listed in `non-core-thin-exemptions.json`.

The current exemption file is a baseline backlog, not permission for new non-core logic. Remove entries as logic moves into `src/core`.

## E2E cloud-only constraint

Playwright E2E is **cloud-executed**, not local-first. Local loops should rely on unit/integration checks unless explicitly instructed otherwise.

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
