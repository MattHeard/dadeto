# Duplication Zero

## Outcome

Reduce Dadeto duplication warnings to zero and keep them at zero while steadily increasing the duplication-detection difficulty until the threshold becomes unreasonably high.

## Current state

The repo runs `npm run duplication` via `jscpd` over `src/core`. Current config already enforces a zero duplication threshold and records reports under `reports/duplication/`. The active detection difficulty is currently controlled by `minTokens` in `.jscpd.json`, which is set to `18`. The duplication inventory is now recorded in this note, and the active open implementation beads target two independent families: the larger `gamepadCapture.js` ↔ `keyboardCapture.js` setup cluster (`dadeto-qmh8`) and the smaller toy/helper cluster spanning `joyConMapper`, `hiLoCardGame`, and `joyConMapping` (`dadeto-trjd`).

## Constraints

Prefer small clone-cluster or helper-extraction beads over broad abstraction churn. Keep behavior stable while reducing duplication, and treat the `minTokens` value as a ratcheting difficulty knob that should only move upward when the repo stays clean at the current setting.

## Open questions

- What is the best first slice: the smallest current clone cluster, a shared helper extraction, or a threshold-ratchet bead after cleanup?
- Which clone families are genuine maintenance risks versus acceptable local repetition that should remain explicit debt?
- What should count as “unreasonably high” for the duplication threshold in this repo: a specific `minTokens` value, a clone shape, or a practical false-positive level?

## Candidate next actions

- Remove the small toy/helper clone cluster (`dadeto-trjd`).
- Remove one small shared setup clone cluster between `gamepadCapture.js` and `keyboardCapture.js` (`dadeto-qmh8`).
- After the repo is clean at `minTokens: 18`, create a threshold-ratchet bead to raise the duplication difficulty.
- Decide what minimal regression guard should define “keep it at zero” once the threshold has been pushed higher.

## Tentative sequence

1. Remove the smallest high-signal clone clusters first instead of chasing every duplicate at once.
2. Re-run `npm run duplication` after each bead and select the next smallest stable clone cluster.
3. The toy/helper family should generally land before the larger cross-input-handler family if both remain viable.
4. When the report stays clean at the current `minTokens`, raise the threshold slightly and treat the new clone surface as the next queue.
5. Continue ratcheting the threshold upward only when the repo is clean at the current setting.
6. Stop the ratchet only when the threshold becomes unreasonably high for this codebase and further increases mostly create noise instead of useful pressure.

## Current duplication inventory

Current artifact: `reports/duplication/jscpd-report.json` generated on `2026-03-08T18:33:46.340Z`.

Active detection setting:
- `minTokens: 18` from `.jscpd.json`
- `28` duplicate entries in the current `jscpd` report

Current clone families:
- `src/core/browser/inputHandlers/gamepadCapture.js` ↔ `src/core/browser/inputHandlers/keyboardCapture.js`
  - Largest stable family in the report.
  - Includes repeated imports, shared setup helpers, repeated `syncToyInput`-style payload wiring, repeated form construction, and repeated handler plumbing.
  - Representative entries: `17` lines at `gamepadCapture.js:864-880` ↔ `keyboardCapture.js:277-293`, `13` lines at `gamepadCapture.js:66-78` ↔ `keyboardCapture.js:54-68`, and multiple `6-10` line helper duplicates across both files.
- `src/core/browser/toys/2026-03-01/joyConMapper.js` ↔ nearby toy/core helpers
  - Small clone family centered on generic parsing / object-check helpers.
  - Representative entries: `11` lines with `hiLoCardGame.js:78-88` ↔ `joyConMapper.js:29-38`, `10` lines with `presenters/joyConMapping.js:33-42` ↔ `joyConMapper.js:29-38`, and `9` lines with `hiLoCardGame.js:132-140` ↔ `joyConMapper.js:11-18`.
- `src/core/browser/inputHandlers/gamepadCapture.js` internal duplicates
  - Repeated short guard / reducer / event-payload fragments inside the same file.
  - Representative entries include `12` lines at `494-505` ↔ `153-163` and several `6-8` line repeats around axis and connection event handling.
- Small spillover clones outside the main families
  - `src/core/commonCore.js` ↔ toy helper guards (`6-10` lines)
  - `src/core/local/symphony.js` ↔ `hiLoCardGame.js` (`6` lines)
  - `blogKeyHandler.js` ↔ `keyboardCapture.js` (`6` lines)
  - `plusOneAnnotator.js` / `edgeWeight.js` single short overlaps with the toy cluster

Likely next implementation slice:
- Start with the smallest high-signal cross-file family in `src/core/browser/toys/2026-03-01/joyConMapper.js`, `src/core/browser/toys/2026-03-01/hiLoCardGame.js`, and `src/core/browser/presenters/joyConMapping.js`.
- Reason: those clones are short, localized, and look like shared parse / object-shape helpers rather than broad handler lifecycle refactors.
- Defer the larger `gamepadCapture.js` ↔ `keyboardCapture.js` family until a bead is shaped specifically around shared capture-form plumbing.
