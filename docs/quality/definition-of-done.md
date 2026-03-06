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

Use `npm run check` when you want the default local aggregate gate for most changes. It runs `npm test` followed by `npm run lint` without replacing any underlying subsystem-specific commands.

1. `npm test`
2. `npm run lint`
3. `npm run build` (when build-relevant paths changed)
4. subsystem checks (for example `npm run build:cloud`, `npm run build:dendritestories-co-nz`, `npm run duplication`)
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
- **E2E-covered release surfaces:** cloud E2E workflow execution

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
