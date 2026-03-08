# Core Lint Zero

## Outcome

Reduce Dadeto `src/core` lint warnings to zero and keep them at zero through future changes.

## Current state

`src/core/browser/inputHandlers/joyConMapper.js` currently carries the known `src/core` lint warnings, including `complexity`, `max-params`, and `no-ternary` findings.

## Constraints

Prefer small warning-family or file-local beads over broad refactors. Keep behavior stable while reducing warnings, and favor durable guardrails that help prevent regressions after cleanup.

## Open questions

- What is the best first slice: highest-complexity hotspots, non-complexity warnings, or a file split?
- Should “keep them at zero” be enforced through documentation only at first, or through a targeted lint gate later?
- When a warning appears to reflect a contract/design issue rather than a local cleanup, when should it stay open as explicit debt instead of spawning more micro-refactor beads?

## Candidate next actions

- Record the current `src/core` lint warning inventory in a short project note with file and rule counts.
- Create one bead for the non-complexity warnings in `joyConMapper.js` (`max-params` and `no-ternary`).
- Create one bead for the highest-complexity hotspots in `joyConMapper.js`.
- Decide what minimal regression guard should define “keep them at zero” once cleanup is complete.

## Tentative sequence

1. Remove non-complexity warnings first so the remaining queue is complexity-only.
2. Reduce the worst complexity hotspots in `joyConMapper.js` before touching smaller local warnings.
3. Continue by re-reading the lint report after each bead and selecting the next smallest hotspot cluster.
4. Split out any warning cluster that looks contract-shaped or design-shaped instead of grinding it through repeated micro-refactors.
5. Once `src/core` reaches zero warnings, define the smallest guardrail that will keep it there.
