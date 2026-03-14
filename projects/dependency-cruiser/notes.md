# Dependency Cruiser

## Outcome

Set up dependency-cruiser in Dadeto, wire it into the check script, and then tighten dependency-graph constraints gradually so the enforced rules converge toward the intended architecture instead of arriving as one large disruptive rule set.

## Priority

- MoSCoW: Must have. Architectural drift becomes harder to reverse the longer the graph stays weakly enforced.
- RICE: High reach and impact because each rule influences large parts of the repo, though some cleanup slices are medium effort.
- Cost of Delay: High. Every day of delay allows more accidental structure to harden.

## Current state

Dependency-cruiser is now wired in and several constraint families have already landed, including the core/local boundary, the broader `src/* -> self or core` warnings, and the stricter `local-writer-no-cycles` error. The recent `dadeto-id5g` slice fixed the `src/build/generate.js -> src/blog.json` warning by moving the source data under `src/build`.

That change exposed a second issue: the runtime `public/blog.json` publish path also needs to be kept in sync. `dadeto-jnj6` is the active follow-up slice for restoring the copy workflow so `src/build/blog.json` flows to `public/blog.json` without weakening the rule.

## Constraints

Introduce the tool incrementally. Prefer one small rule family at a time over a broad initial policy that floods the repo with noise. Keep the first setup slice focused on installing the tool, adding a baseline config, and wiring it into the existing check workflow without blocking unrelated work prematurely.

## Open questions

- Which first dependency rules are high-signal enough to enforce immediately without producing noisy false positives?
- How should the first config distinguish experimental architecture guidance from rules that are already stable enough to encode?
- Should the initial check script run in a warning/reporting mode first, or fail immediately on a tiny baseline rule set?
- Which directory boundaries in `src/core` are already strong enough to serve as the first enforced layering constraints?

## Candidate next actions

- Land `dadeto-jnj6` so the build-layer source move is reflected in the `public/blog.json` publish path.
- After that, rerun depcruise and choose the next real violation or the next high-signal rule family to tighten.
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
- **2026-03-11:** Added broader `src/*` warning rules, promoted `local-writer-no-cycles` to `error`, cleaned the `src/build/generate.js` violation, and opened a follow-up to keep `public/blog.json` aligned with the new `src/build/blog.json` source.
