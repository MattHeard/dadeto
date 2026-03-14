# Branch Coverage 100

## Outcome

Raise Dadeto branch coverage to 100% and keep it there through future changes.

## Priority

- MoSCoW: Should have. Better coverage lowers regression risk, but it is not blocking current operator-loop work.
- RICE: Medium impact with moderate effort because each bead removes risk in one surface but does not usually unlock broad repo change.
- Cost of Delay: Medium. Coverage debt matters most where active code keeps changing, but the pain is less immediate than orchestration or architecture drift.

## Current state

The repo still uses `npm test` plus the regenerated `reports/coverage/coverage-summary.json` as the planning artifact, but the project has moved beyond the old smallest helper gaps. Recent slices pushed `captureFormShared.js` and `src/core/browser/presenters/joyConMapping.js` to full branch coverage, so the remaining work is now concentrated in larger browser input-handler and toy surfaces.

The broadest remaining branch gaps are still concentrated in:

- `src/core/browser/inputHandlers/joyConMapper.js`
- `src/core/browser/toys/2026-03-01/joyConMapper.js`
- `src/core/browser/inputHandlers/gamepadCapture.js`
- `src/core/browser/toys/2026-03-01/hiLoCardGame.js`

There is currently no fresh ready bead for this project, so the next planner pass should shape a new bounded slice from the latest coverage artifact instead of reusing the old helper-focused plan.

## Constraints

Prefer small file-local or behavior-local coverage beads over broad test rewrites. Keep runtime behavior stable, and favor durable regression tests that clearly explain which branches are being covered.

## Open questions

- Which branch gaps reflect missing behavior tests versus code that should be simplified or made unreachable?
- Should “keep it at 100%” rely only on repo discipline, or also on a stricter CI/reporting gate later?
- After the smallest helper files are covered, should the next slice stay on browser input helpers or switch to a toy/presenter surface such as `hiLoCardGame.js` or `joyConMapping.js`?

## Candidate next actions

- Create one new bead from the current coverage artifact for the next smallest stable gap now that `captureFormShared.js` and `joyConMapping.js` are fully covered.
- Prefer `hiLoCardGame.js` or a bounded `gamepadCapture.js` branch cluster before touching the very large `joyConMapper` surfaces again.
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
