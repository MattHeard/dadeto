# Evaluator Matrix

This matrix defines the expected evaluator per subsystem, how to run it, and what to do when it fails.
Use this as the canonical checklist before closure.

## Evaluators by subsystem

### 1) Cross-repo behavior — Jest unit/integration + coverage
- **Purpose:** Validate behavior and enforce branch coverage expectations for local loops.
- **Command/workflow:** `npm test`
- **When required:** **Mandatory for every change** before closure.
- **Artifact location:** Terminal output plus generated coverage artifacts (for example `coverage/` when present).
- **Failure escalation path:**
  1. Fix test or production code and re-run `npm test`.
  2. If failure is unrelated to your change, open/attach a `bd` bead with command output evidence.
  3. Do not close work until the failure has an owning bead and triage note.

### 2) Style/static hygiene — ESLint + formatting checks
- **Purpose:** Catch lint regressions and formatting drift before integration.
- **Command/workflow:** `npm run lint`
- **When required:** Mandatory when JS/TS/CSS/MD or tooling configs are touched; recommended otherwise.
- **Artifact location:** Terminal output and any generated lint reports (for example under `reports/lint/` when configured).
- **Failure escalation path:**
  1. Apply fixes locally and re-run lint.
  2. If tooling/config is broken, create/attach a `bd` bead with failing output.

### Aggregate shortcuts
- **`npm run check`:** default local aggregate gate (`npm test` + `npm run lint` + `npm run depcruise` + `npm run duplication`).
- **What stays out:** `npm run tsdoc:check`, `npm run build:cloud`, and `npm run build:dendritestories-co-nz` remain opt-in / subsystem-specific until their owning beads call for them.

### 3) Build pipeline smoke — static generation/package build
- **Purpose:** Ensure the repository can compile/package after changed sources.
- **Command/workflow:** `npm run build`
- **When required:** Mandatory for build pipeline changes and any source changes that affect generated output.
- **Artifact location:** Terminal output plus generated assets in build output directories (for example `public/`).
- **Failure escalation path:**
  1. Fix build breakage and re-run.
  2. If blocked by infra/dependency issues, document and open/attach a `bd` bead.

### 4) Dendrite static packaging
- **Purpose:** Verify Dendrite-specific static copy/packaging paths.
- **Command/workflow:** `npm run build:dendritestories-co-nz`
- **When required:** Mandatory when Dendrite package/public paths are touched; optional otherwise.
- **Artifact location:** Terminal output and copied artifacts under infra/public targets.
- **Failure escalation path:**
  1. Fix packaging path/config.
  2. If destination infra paths are invalid/unavailable, escalate via `bd` with artifact evidence.

### 5) Cloud packaging
- **Purpose:** Validate cloud deploy package assembly.
- **Command/workflow:** `npm run build:cloud`
- **When required:** Mandatory when cloud runtime, infra cloud packaging, or deploy files change.
- **Artifact location:** Terminal output and assembled deploy files under infra/cloud targets.
- **Failure escalation path:**
  1. Fix packaging script/runtime assumptions.
  2. If cloud infra assumptions changed, open/attach `bd` and include broken artifact paths.

### 6) Local runtime smoke (writer)
- **Purpose:** Confirm local writer runtime can boot and serve expected endpoints.
- **Command/workflow:** `npm run start:writer:playwright` with an HTTP probe/log check.
- **When required:** Mandatory for local writer/runtime changes; optional otherwise.
- **Artifact location:** Local server logs and probe command output.
- **Failure escalation path:**
  1. Fix startup/runtime error.
  2. If environment-specific, record reproducible steps and track in `bd`.

### 7) End-to-end user journey — Playwright (cloud)
- **Purpose:** Validate full user flows in production-like cloud execution.
- **Command/workflow:** CI/cloud workflow execution via GitHub Actions + Cloud Run job (not local-first).
- **When required:** Mandatory in CI/release gates for e2e-covered surfaces; optional for local loop completion unless explicitly requested.
- **Artifact location:** CI artifacts such as `playwright-report/` and uploaded Cloud Run logs.
- **Failure escalation path:**
  1. Check unit/integration failures first locally.
  2. Inspect CI Cloud Run execution/log artifacts.
  3. Open/attach `bd` with workflow URL + failing artifact pointers.

### 8) Dependency architecture (duplication/coupling trend)
- **Purpose:** Detect maintainability drift and coupling/duplication regressions.
- **Command/workflow:** `npm run duplication`
- **When required:** Mandatory for refactors touching shared modules; optional otherwise.
- **Artifact location:** Reports under `reports/duplication` (or configured output) and terminal logs.
- **Failure escalation path:**
  1. Reduce duplication/coupling or document accepted exception.
  2. Track unresolved exceptions via `bd` before closure.

### 9) Mutation confidence (scheduled/deep quality)
- **Purpose:** Measure robustness of tests against behavioral mutations.
- **Command/workflow:** `npm run stryker`
- **When required:** Optional in daily local loops; required for designated hardening cycles.
- **Artifact location:** `reports/mutation/text/mutation.txt` and related mutation reports.
- **Failure escalation path:**
  1. Add/strengthen tests for surviving mutants.
  2. Record remaining risk and link to `bd` follow-up if not fixed in current loop.
