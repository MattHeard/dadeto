# Branch Coverage 100

## Outcome

Raise Dadeto branch coverage to 100% and keep it there through future changes.

## Current state

The repo already runs `npm test` with coverage and emits artifacts under `reports/coverage/`. Existing docs and tests explicitly reference branch coverage, and the repo policy expects 100% branch coverage before closure. Current gaps should be treated as a sequence of small uncovered-branch slices rather than one broad coverage sweep.

## Constraints

Prefer small file-local or behavior-local coverage beads over broad test rewrites. Keep runtime behavior stable, and favor durable regression tests that clearly explain which branches are being covered.

## Open questions

- What is the best first slice: the lowest-coverage/highest-signal core file, a small utility/helper file, or an existing uncovered-branch test family?
- Which branch gaps reflect missing behavior tests versus code that should be simplified or made unreachable?
- Should “keep it at 100%” rely only on repo discipline, or also on a stricter CI/reporting gate later?

## Candidate next actions

- Record the current branch-coverage gap inventory in a short project note with file and branch counts from `reports/coverage/coverage-summary.json`.
- Create one bead for the smallest high-signal uncovered branch cluster.
- Create one bead to tighten the repo policy/docs around how branch-coverage gaps should be turned into runner-safe beads.
- Decide what minimal regression guard should define “keep it at 100%” once coverage reaches the target.

## Tentative sequence

1. Start with the smallest high-signal uncovered branch cluster, not the broadest file by size.
2. Prefer existing uncovered-branch test families and files with clear coverage artifacts before broad exploratory test work.
3. Re-read `reports/coverage/coverage-summary.json` after each bead and select the next smallest stable branch-gap cluster.
4. Split out any gap that appears to reflect a design or reachability problem instead of layering speculative tests on top.
5. Once branch coverage reaches 100%, define the smallest guardrail that will keep it there.
