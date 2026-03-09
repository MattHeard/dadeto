# Branch Coverage 100

## Outcome

Raise Dadeto branch coverage to 100% and keep it there through future changes.

## Current state

The repo already runs `npm test` with coverage and emits artifacts under `reports/coverage/`. A fresh full-suite run on 2026-03-09 confirmed that `reports/coverage/coverage-summary.json` is still not a trustworthy repo-wide branch-gap inventory: even after regeneration it contains only one file entry, `/home/matt/dadeto/src/core/browser/inputHandlers/blogKeyHandler.js`, and reports branch coverage there as `8/10` (`80%`). That still conflicts with earlier LCOV-based bead evidence showing `blogKeyHandler.js` at `BRF:6` and `BRH:6` after a fresh suite run, and it also conflicts with the much broader branch-gap table printed directly by Jest during the same `npm test` run. So the current practical state is that the summary artifact itself appears stale, truncated, or misconfigured, and the next coverage bead should begin by repairing or replacing the artifact chain before choosing a new implementation slice.

## Constraints

Prefer small file-local or behavior-local coverage beads over broad test rewrites. Keep runtime behavior stable, and favor durable regression tests that clearly explain which branches are being covered.

## Open questions

- Why does `reports/coverage/coverage-summary.json` currently contain only one file entry, and is that caused by reporter configuration, stale generation, or a partial write?
- Which artifact should be treated as canonical for branch planning right now: `coverage-summary.json`, `lcov.info`, or a regenerated summary from the same test run?
- Which branch gaps reflect missing behavior tests versus code that should be simplified or made unreachable?
- Should “keep it at 100%” rely only on repo discipline, or also on a stricter CI/reporting gate later?

## Candidate next actions

- Repair or regenerate the branch-coverage summary artifact so it yields a real repo-wide file inventory instead of a single-file record.
- Inspect the coverage reporter configuration and generation path to explain why the text reporter shows many files while `coverage-summary.json` collapses to one.
- Reconcile `coverage-summary.json` against `lcov.info` from the same fresh run and document which one should drive planner decisions.
- Once the artifact chain is trustworthy, use the resulting inventory to choose the next smallest uncovered branch cluster after `blogKeyHandler.js`.
- Create one bead to tighten the repo policy/docs around how branch-coverage gaps should be turned into runner-safe beads if artifact ambiguity keeps recurring.
- Decide what minimal regression guard should define “keep it at 100%” once coverage reaches the target.

## Tentative sequence

1. First restore a trustworthy repo-wide branch-gap artifact; do not select the next implementation bead from the current single-file summary.
2. Reconcile `coverage-summary.json` and `lcov.info` from the same fresh run before assuming any file is still uncovered.
3. Then start with the smallest high-signal uncovered branch cluster, not the broadest file by size.
4. Prefer existing uncovered-branch test families and files with clear coverage artifacts before broad exploratory test work.
5. Split out any gap that appears to reflect a design or reachability problem instead of layering speculative tests on top.
6. Once branch coverage reaches 100%, define the smallest guardrail that will keep it there.

## Current artifact snapshot

- Fresh `npm test` on 2026-03-09 did regenerate `reports/coverage/coverage-summary.json`, but the file still exposes only one file-local entry plus the `total` block, so it is not usable as a repo-wide inventory.
- The only file named in that summary is `src/core/browser/inputHandlers/blogKeyHandler.js`.
- The summary reports `branches.total = 10`, `branches.covered = 8`, `branches.pct = 80` for that file.
- The same fresh `npm test` run printed a much larger multi-file branch report to the terminal, so the immediate gap is artifact trust and reporter alignment, not a newly confirmed uncovered branch cluster from `coverage-summary.json`.
