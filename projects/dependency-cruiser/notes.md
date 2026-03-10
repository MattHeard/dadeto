# Dependency Cruiser

## Outcome

Set up dependency-cruiser in Dadeto, wire it into the check script, and then tighten dependency-graph constraints gradually so the enforced rules converge toward the intended architecture instead of arriving as one large disruptive rule set.

## Current state

Dadeto does not yet have dependency-cruiser wired into the repo checks. The project should begin by making the tool runnable and low-friction, then use real graph feedback to ratchet constraints upward over time. The goal is not only to detect dependency violations, but to do so in a way that matches the emerging architectural vision instead of freezing today’s accidental structure in place.

## Constraints

Introduce the tool incrementally. Prefer one small rule family at a time over a broad initial policy that floods the repo with noise. Keep the first setup slice focused on installing the tool, adding a baseline config, and wiring it into the existing check workflow without blocking unrelated work prematurely.

## Open questions

- Which first dependency rules are high-signal enough to enforce immediately without producing noisy false positives?
- How should the first config distinguish experimental architecture guidance from rules that are already stable enough to encode?
- Should the initial check script run in a warning/reporting mode first, or fail immediately on a tiny baseline rule set?
- Which directory boundaries in `src/core` are already strong enough to serve as the first enforced layering constraints?

## Candidate next actions

- Install dependency-cruiser and add the smallest baseline config to the repo.
- Wire a dependency-cruiser command into the repo check script or package-script workflow.
- Start with one or two high-signal dependency rules instead of a broad graph policy.
- Record the first rule-tightening sequence in project notes so future SNC sessions ratchet constraints deliberately.
- Use real violations to decide whether the next move is a code cleanup bead or a rule-refinement bead.

## Tentative sequence

1. Install dependency-cruiser and make it runnable from the repo.
2. Add the smallest baseline config and wire it into the check workflow.
3. Run it in a narrow, low-noise mode first and inspect the initial graph/violations.
4. Tighten one rule family at a time, shaping cleanup beads when the graph exposes real architectural drift.
5. Keep ratcheting the rules only as fast as the codebase and queue can absorb them.

## Latest tightening

- **2026-03-10:** Added a `core-no-local-deps` forbidden rule so shared `src/core` modules cannot depend on runner-specific `src/local` helpers; the boundary is enforced with severity `error` because the current baseline is already clean.
