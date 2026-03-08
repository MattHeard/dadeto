# Core Lint Zero

## Outcome

Reduce Dadeto `src/core` lint warnings to zero and keep them at zero through future changes.

## Current state

`src/core/browser/inputHandlers/joyConMapper.js` is still the active warning surface, but the non-complexity warnings and several early helper/hotspot clusters have already been removed. The remaining queue has narrowed to complexity-only cleanup, with the current open bead focused on the axis-helper cluster in `detectAxisCapture` and `selectStrongerAxisCapture` (`dadeto-mjpv`).

## Constraints

Prefer small warning-family or file-local beads over broad refactors. Keep behavior stable while reducing warnings, and favor durable guardrails that help prevent regressions after cleanup.

## Open questions

- What is the best first slice: highest-complexity hotspots, non-complexity warnings, or a file split?
- Should “keep them at zero” be enforced through documentation only at first, or through a targeted lint gate later?
- When a warning appears to reflect a contract/design issue rather than a local cleanup, when should it stay open as explicit debt instead of spawning more micro-refactor beads?

## Candidate next actions

- Reduce the next axis-helper complexity cluster in `joyConMapper.js` (`dadeto-mjpv`).
- Continue with the next smallest stable complexity cluster after re-reading the lint report.
- Split out any remaining warning family that turns out to be contract-shaped instead of helper-shaped.
- Decide what minimal regression guard should define “keep them at zero” once cleanup is complete.

## Tentative sequence

1. Non-complexity warnings are already gone, so the queue is now complexity-only.
2. Continue by re-reading the lint report after each bead and selecting the next smallest hotspot cluster.
3. Prefer local helper clusters before broader handler-level cleanup.
4. Split out any warning cluster that looks contract-shaped or design-shaped instead of grinding it through repeated micro-refactors.
5. Once `src/core` reaches zero warnings, define the smallest guardrail that will keep it there.
