# Directory Shared Core

## Outcome

Experiment with a directory convention where each directory prefers one primary shared module named after the directory, and use the shape of that shared module to discover when the directory should be split.

## Current state

Dadeto has at least one strong example of this pattern in `src/core/browser/inputHandlers/browserInputHandlersCore.js`, but it also has narrower shared/helper files such as `captureFormShared.js`. The project is exploratory: the goal is to gather enough practical refactoring feedback to decide whether this convention improves predictability for coding agents and whether “shared file becoming incoherent” is a useful signal that the directory structure itself should split.

## Constraints

Treat this as an experiment, not a settled architecture mandate. Prefer small trials in real directories over broad repo-wide rewrites. Capture feedback from actual refactors and agent usage before hardening the rule into a stronger policy.

## Open questions

- Does “one primary shared module per directory” actually make agent behavior more predictable in practice?
- When a shared module starts collecting unrelated helper families, is splitting the directory usually cleaner than introducing another helper file?
- Which directories are the best trial cases for this convention without forcing awkward abstractions?
- What language should the eventual convention use so it guides agents without turning into a brittle absolute?

## Candidate next actions

- Document the exploratory convention in repo guidance as a preferred default, not a strict law.
- Trial the convention in `src/core/browser/inputHandlers` and record what becomes cleaner or more awkward.
- Identify one or two additional directories where a shared-module consolidation or directory split would provide useful feedback.
- Decide what evidence would be strong enough to promote the experiment into a firmer repo convention.

## Tentative sequence

1. Start with documentation and one or two small refactoring trials.
2. Record what agents find more predictable about imports and shared helper placement.
3. When a shared module becomes incoherent, treat that as evidence to explore a directory split rather than adding more ad hoc helper files.
4. Only after several real examples, decide whether to codify this as a stronger architectural rule.
