# Directory Shared Core

## Outcome

Experiment with a directory convention where each directory prefers one primary shared module named after the directory, and use the shape of that shared module to discover when the directory should be split.

## Priority

- MoSCoW: Could have. This is exploratory architecture guidance rather than an urgent operational or product need.
- RICE: Lower reach and lower near-term impact because the project is intentionally experimental and evidence-gathering.
- Cost of Delay: Low. Waiting mostly postpones learning rather than increasing concrete failure cost.

## Current state

Dadeto has at least one strong example of this pattern in `src/core/browser/inputHandlers/browserInputHandlersCore.js`, but it also has narrower shared/helper files such as `captureFormShared.js`. The project is exploratory: the goal is to gather enough practical refactoring feedback to decide whether this convention improves predictability for coding agents and whether “shared file becoming incoherent” is a useful signal that the directory structure itself should split.

Two real trial slices have already been run and recorded, so the project is now past the first proof-of-concept stage. The next ready bead, `dadeto-zpi1`, is to choose and document a third real trial target using the existing rubric so the comparison set gets broader than the initial input-handler examples.

- Freshness check: reviewed on 2026-03-17 and still tracking toward the next comparative trial.

## Constraints

Treat this as an experiment, not a settled architecture mandate. Prefer small trials in real directories over broad repo-wide rewrites. Capture feedback from actual refactors and agent usage before hardening the rule into a stronger policy.

## Open questions

- Does “one primary shared module per directory” actually make agent behavior more predictable in practice?
- When a shared module starts collecting unrelated helper families, is splitting the directory usually cleaner than introducing another helper file?
- Which directories are the best trial cases for this convention without forcing awkward abstractions?
- What language should the eventual convention use so it guides agents without turning into a brittle absolute?

## Candidate next actions

- Document the exploratory convention in repo guidance as a preferred default, not a strict law.
- Use `dadeto-zpi1` to pick and run the third real trial in a different directory with shared-helper pressure.
- Identify one or two additional directories where a shared-module consolidation or directory split would provide useful feedback.
- Define a small experiment rubric so future trial beads capture comparable evidence instead of only subjective impressions.
- Decide what evidence would be strong enough to promote the experiment into a firmer repo convention.

## Tentative sequence

1. Start with documentation and one or two small refactoring trials.
2. Record what agents find more predictable about imports and shared helper placement.
3. When a shared module becomes incoherent, treat that as evidence to explore a directory split rather than adding more ad hoc helper files.
4. Only after several real examples, decide whether to codify this as a stronger architectural rule.

## Experiment design

Run a small comparative experiment using real maintenance/refactor beads in a few directories with shared-helper pressure rather than one broad rewrite.

Suggested setup:

1. Pick `2-3` directories with live shared-helper decisions to make.
2. Treat the current convention as the experimental default:
   - prefer one primary shared module per directory, named after the directory
   - put new cross-file helpers there by default
   - if that file becomes incoherent, treat that as evidence to split the directory instead of adding more miscellaneous helper files
3. After each trial bead, record the same evidence so different trials stay comparable.

Suggested evidence rubric for each trial:

- which directory and bead were used for the trial
- what shared/helper placement decision had to be made
- where the agent looked first for shared logic
- whether the correct placement felt obvious or required exploration
- whether the trial reduced or increased helper-file sprawl
- whether the shared module stayed coherent or started mixing unrelated helper families
- whether the pressure suggested a directory split
- whether imports became more predictable for future work

Success signals:

- agents look for the directory-named shared module first
- fewer ad hoc `shared`, `helpers`, or `utils` files appear in the same directory
- helper placement becomes faster and more predictable
- incoherence surfaces as a clear directory-splitting signal instead of silent file sprawl

Failure signals:

- the shared module becomes a junk drawer quickly
- agents still add side helper files because the convention does not fit the directory
- the rule adds friction without making placement decisions more predictable
