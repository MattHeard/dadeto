# Duplication Zero

## Outcome

Reduce Dadeto duplication warnings to zero and keep them at zero while steadily increasing the duplication-detection difficulty until the threshold becomes unreasonably high.

## Current state

The repo runs `npm run duplication` via `jscpd` over `src/core`. Current config already enforces a zero duplication threshold and records reports under `reports/duplication/`. The active detection difficulty is currently controlled by `minTokens` in `.jscpd.json`, which is set to `18`.

## Constraints

Prefer small clone-cluster or helper-extraction beads over broad abstraction churn. Keep behavior stable while reducing duplication, and treat the `minTokens` value as a ratcheting difficulty knob that should only move upward when the repo stays clean at the current setting.

## Open questions

- What is the best first slice: the smallest current clone cluster, a shared helper extraction, or a threshold-ratchet bead after cleanup?
- Which clone families are genuine maintenance risks versus acceptable local repetition that should remain explicit debt?
- What should count as “unreasonably high” for the duplication threshold in this repo: a specific `minTokens` value, a clone shape, or a practical false-positive level?

## Candidate next actions

- Record the current duplication inventory in a short project note with clone clusters and the active `minTokens` setting.
- Create one bead for the smallest high-signal clone cluster in `src/core`.
- Create one bead to ratchet `minTokens` upward after the repo stays clean at the current difficulty.
- Decide what minimal regression guard should define “keep it at zero” once the threshold has been pushed higher.

## Tentative sequence

1. Remove the smallest high-signal clone clusters first instead of chasing every duplicate at once.
2. Re-run `npm run duplication` after each bead and select the next smallest stable clone cluster.
3. When the report stays clean at the current `minTokens`, raise the threshold slightly and treat the new clone surface as the next queue.
4. Continue ratcheting the threshold upward only when the repo is clean at the current setting.
5. Stop the ratchet only when the threshold becomes unreasonably high for this codebase and further increases mostly create noise instead of useful pressure.
