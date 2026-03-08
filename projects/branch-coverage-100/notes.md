# Branch Coverage 100

## Outcome

Raise Dadeto branch coverage to 100% and keep it there through future changes.

## Current state

The repo already runs `npm test` with coverage and emits artifacts under `reports/coverage/`. A file-local branch-coverage slice for `blogKeyHandler.js` has already been validated as effectively clean via fresh LCOV data, while `coverage-summary.json` still appears stale or inconsistent for that file. The current open bead is `dadeto-sg1i`, which should turn the coverage artifacts into a planner-usable gap inventory before the next implementation slice is chosen.

## Constraints

Prefer small file-local or behavior-local coverage beads over broad test rewrites. Keep runtime behavior stable, and favor durable regression tests that clearly explain which branches are being covered.

## Open questions

- What is the best first slice: the lowest-coverage/highest-signal core file, a small utility/helper file, or an existing uncovered-branch test family?
- Which branch gaps reflect missing behavior tests versus code that should be simplified or made unreachable?
- Should “keep it at 100%” rely only on repo discipline, or also on a stricter CI/reporting gate later?

## Candidate next actions

- Record the current branch-coverage gap inventory and reconcile which artifact should be trusted first (`dadeto-sg1i`).
- Use that inventory to choose the next smallest uncovered branch cluster after `blogKeyHandler.js`.
- Create one bead to tighten the repo policy/docs around how branch-coverage gaps should be turned into runner-safe beads if artifact ambiguity keeps recurring.
- Decide what minimal regression guard should define “keep it at 100%” once coverage reaches the target.

## Tentative sequence

1. Start with the smallest high-signal uncovered branch cluster, not the broadest file by size.
2. Prefer existing uncovered-branch test families and files with clear coverage artifacts before broad exploratory test work.
3. Re-read the coverage artifacts after each bead and resolve any disagreement between summary and LCOV output before shaping the next slice.
4. Split out any gap that appears to reflect a design or reachability problem instead of layering speculative tests on top.
5. Once branch coverage reaches 100%, define the smallest guardrail that will keep it there.
