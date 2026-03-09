## Context

`dadeto-sg1i` asked for a planner-usable branch-coverage gap inventory sourced from `reports/coverage/coverage-summary.json`.

## What I found

A fresh full `npm test` run on 2026-03-09 did regenerate coverage artifacts, but `reports/coverage/coverage-summary.json` still contained only the `total` block plus one file entry for `src/core/browser/inputHandlers/blogKeyHandler.js`, reporting branch coverage as `8/10` (`80%`).

That remains inconsistent with earlier LCOV evidence for `blogKeyHandler.js`, and it also disagrees with the much broader multi-file branch-gap table printed directly by Jest during the same run.

## Outcome

I updated `projects/branch-coverage-100/notes.md` to record that the immediate planning problem is artifact trust and reporter alignment, not yet selection of the next implementation slice.

## Recommended next action

Create a bead to inspect the coverage reporter/configuration path and reconcile `coverage-summary.json` with `lcov.info` and the text reporter from the same fresh run.
