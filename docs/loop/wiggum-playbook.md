# Wiggum Loop Playbook

Use this playbook to run one canonical, evidence-driven loop that pushes a clear boundary and leaves reusable learning in the repository.

## Canonical Loop Template

### 1) Hypothesis (what boundary to push)
State a falsifiable hypothesis about a specific architectural, quality, or workflow boundary.

- Name the boundary explicitly (example: core/domain separation, evaluator reliability, toy module portability).
- Describe the expected outcome if the hypothesis is true.
- Describe the signal that would disprove it.

### 2) Minimal Slice Selection
Choose the smallest change that still tests the hypothesis.

- Prefer one file or one behavior path first.
- Avoid broad refactors before boundary evidence exists.
- Keep rollback simple and low-risk.

### 3) Acceptance / Evidence Definition
Define acceptance before implementation.

- Name the exact command(s) or artifact path(s) that prove success.
- Separate pass conditions from observation-only diagnostics.
- Ensure evidence is reproducible by another agent.

### 4) Implementation Pass
Apply the minimal change needed to test the hypothesis.

- Keep code bounded to the selected slice.
- Preserve existing interfaces unless boundary evidence requires an API shift.
- Capture notable assumptions in comments or docs when they affect future loops.

### 5) Harness Run
Run the cheapest reliable evaluator first, then expand scope only if risk justifies it.

- Start with narrow unit/lint/check commands.
- Escalate to heavier validation for cross-module or runtime behavior.
- Save logs, snapshots, or reports that prove outcomes.

### 6) Failure Classification
If the loop fails, classify failure mode before changing more code.

- Use a taxonomy label from [Failure Taxonomy Labels](#failure-taxonomy-labels).
- Record observed symptom, likely root cause, and next smallest fix.
- Avoid stacking multiple speculative fixes in one loop.

### 7) Repo-Memory Upgrade
Encode loop learning so future agents can see and reuse it.

- Add or update docs, harnesses, rules, scripts, or tests.
- Link the learning directly to the boundary and evidence.
- Prefer concrete guardrails over narrative-only notes.

## Required Outputs Per Loop Cycle

Each completed loop must produce all of the following:

1. **Code change (if any)**
   - A bounded implementation or configuration update aligned with the hypothesis.
2. **One evidence artifact**
   - At least one verifiable artifact, such as a test run output, log, snapshot, or report path.
3. **One memory artifact**
   - At least one durable repository update that captures learning (doc/rule/harness update).

## Failure Taxonomy Labels

Use one primary label per loop failure to standardize learning:

- **legibility gap**
  - Code or docs are hard to read, making intent and diagnosis unclear.
- **missing harness**
  - No reliable local/CI evaluator exists for the changed behavior.
- **ambiguous acceptance**
  - Success criteria are unclear, inconsistent, or non-falsifiable.
- **environment/config drift**
  - Runtime or tooling behavior differs due to config, dependency, or environment mismatch.
- **architecture mismatch**
  - Proposed change conflicts with established module boundaries or system shape.

## Boundary Push Checklist (new toys)

Before adding or expanding a toy, answer all checklist items:

- **What architectural boundary is challenged?**
  - Identify which boundary is intentionally stressed (module seam, runtime adapter, state boundary, etc.).
- **What is the rollback path?**
  - Describe exactly how to revert if signals degrade.
- **What is the observability channel?**
  - Name where loop evidence will be captured (unit test output, logs, snapshots, reports).
- **What is evaluator scope and cost?**
  - Define the cheapest first evaluator and when to escalate to broader checks.

## Example Loop Pass

**Hypothesis**
A new toy can stay isolated from core domain logic by adding a browser-only adapter without touching `src/core`.

**Minimal Slice**
Add one toy registration entry and one browser adapter file.

**Acceptance / Evidence**
- `npm test -- toyRegistration` passes.
- `npm run lint` passes for touched files.

**Implementation Pass**
Implement the adapter and registration hook only; no cross-cutting refactors.

**Harness Run**
Run the targeted toy registration test first, then lint.

**Failure Classification**
Initial test failure labeled **architecture mismatch** after adapter attempted to import core-only runtime state.

**Repo-Memory Upgrade**
Update toy docs with an explicit “browser adapter must not import `src/core` runtime dependencies” rule and add a harness check for forbidden import paths.

**Loop Outputs Produced**
- Code change: toy adapter + registration.
- Evidence artifact: targeted test output.
- Memory artifact: docs rule + harness guard.
