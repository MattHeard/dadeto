# Core Lint Zero

## Outcome

Reduce Dadeto `src/core` lint warnings to zero and keep them at zero through future changes.

## Priority

- MoSCoW: Should have. This is important code-health work, but it is less foundational than the Symphony/operator surfaces.
- RICE: High impact on future maintenance with moderate reach, and the project already decomposes into small bounded slices.
- Cost of Delay: High. Active warning hotspots in `src/core` get more expensive as more changes accumulate around them.

## Current state

`src/core/browser/inputHandlers/joyConMapper.js` is still the active warning surface, but several small slices have already landed. The payload/row-state helper cluster is gone, and the earlier handler-level complexity warning was also removed. The repo-wide lint output is now down to a smaller warning set spread across `joyConMapper.js`, `captureFormShared.js`, `captureLifecycleToggle.js`, `gamepadCapture.js`, local Symphony, and a couple of test files.

The current ready bead for this project is `dadeto-m6am`, which picks up the next remaining `joyConMapper.js` complexity slice after the closed `dadeto-5fgp` cleanup.

- Freshness check: reviewed on 2026-03-17 and still points at the current `joyConMapper.js` cleanup queue.

## Constraints

Prefer small warning-family or file-local beads over broad refactors. Keep behavior stable while reducing warnings, and favor durable guardrails that help prevent regressions after cleanup.

## Open questions

- What is the best first slice: highest-complexity hotspots, non-complexity warnings, or a file split?
- Should “keep them at zero” be enforced through documentation only at first, or through a targeted lint gate later?
- When a warning appears to reflect a contract/design issue rather than a local cleanup, when should it stay open as explicit debt instead of spawning more micro-refactor beads?

## Candidate next actions

- Continue with the next smallest stable complexity cluster after re-reading the lint report.
- Split out any remaining warning family that turns out to be contract-shaped instead of helper-shaped.
- Decide what minimal regression guard should define “keep them at zero” once cleanup is complete.

## Tentative sequence

1. Non-complexity warnings are already gone, so the queue is now complexity-only.
2. Continue with the local payload/row-state helper cluster before touching stored-state refresh or handler-level warnings.
3. Prefer local helper clusters before broader handler-level cleanup.
4. Split out any warning cluster that looks contract-shaped or design-shaped instead of grinding it through repeated micro-refactors.
5. Once `src/core` reaches zero warnings, define the smallest guardrail that will keep it there.
