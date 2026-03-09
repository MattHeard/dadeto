# Branch Coverage 100

## Outcome

Raise Dadeto branch coverage to 100% and keep it there through future changes.

## Current state

The repo runs `npm test` with coverage and now rewrites `reports/coverage/coverage-summary.json` from the repo-wide raw map in `reports/coverage/coverage-final.json`. A fresh full-suite run on 2026-03-09 shows the summary is again usable as a planning artifact.

Current highest-gap files from the repaired summary are:

- `src/core/browser/inputHandlers/joyConMapper.js`: `0/141` branches (`0%`)
- `src/core/browser/toys/2026-03-01/joyConMapper.js`: `0/30` branches (`0%`)
- `src/core/browser/inputHandlers/gamepadCapture.js`: `38/66` branches (`57.57%`)
- `src/core/browser/presenters/joyConMapping.js`: `0/10` branches (`0%`)
- `src/core/browser/toys/2026-03-01/hiLoCardGame.js`: `38/48` branches (`79.16%`)

The broad `joyConMapper` surfaces are still too large for one safe first coverage bead. The next smallest stable uncovered cluster is `src/core/browser/inputHandlers/captureFormShared.js`, which currently has `4/8` covered branches (`50%`) and only `4` missed branches. That is the current best next implementation target from the repaired artifact.

## Constraints

Prefer small file-local or behavior-local coverage beads over broad test rewrites. Keep runtime behavior stable, and favor durable regression tests that clearly explain which branches are being covered.

## Open questions

- Which branch gaps reflect missing behavior tests versus code that should be simplified or made unreachable?
- Should “keep it at 100%” rely only on repo discipline, or also on a stricter CI/reporting gate later?
- After the smallest helper files are covered, should the next slice stay on browser input helpers or switch to a toy/presenter surface such as `hiLoCardGame.js` or `joyConMapping.js`?

## Candidate next actions

- Create one bead for `src/core/browser/inputHandlers/captureFormShared.js` to cover the remaining `4` missed branches.
- After that, choose between `src/core/browser/toys/2026-03-01/hiLoCardGame.js` and `src/core/browser/presenters/joyConMapping.js` as the next bounded file-local slice.
- Keep the repaired `coverage-summary.json` as the canonical top-level branch-gap artifact and refresh project notes from it after each coverage bead.
- Create one bead to tighten the repo policy/docs around how branch-coverage gaps should be turned into runner-safe beads if artifact ambiguity keeps recurring.
- Decide what minimal regression guard should define “keep it at 100%” once coverage reaches the target.

## Tentative sequence

1. Start with `captureFormShared.js` as the smallest missed-branch cluster from the repaired summary.
2. Then prefer the next smallest bounded slice such as `joyConMapping.js` or `hiLoCardGame.js` before touching the very large `joyConMapper` surfaces.
3. Keep using the repaired `coverage-summary.json` to choose the next target after each bead.
4. Split out any gap that appears to reflect a design or reachability problem instead of layering speculative tests on top.
5. Once branch coverage reaches 100%, define the smallest guardrail that will keep it there.

## Current artifact snapshot

- Fresh `npm test` on 2026-03-09 regenerated `reports/coverage/coverage-summary.json` with the repo-wide file inventory, sourced from `reports/coverage/coverage-final.json`.
- The next smallest stable uncovered cluster from that summary is `src/core/browser/inputHandlers/captureFormShared.js` with `4/8` covered branches (`50%`).
- The broadest gaps remain `joyConMapper`-related files, but they are not the best first runner-safe coverage slice.
