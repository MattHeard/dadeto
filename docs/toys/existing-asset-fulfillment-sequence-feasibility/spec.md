# EXIS2 — Existing Asset Fulfillment Sequence Feasibility

EXIS2 tests whether one concrete asset can accommodate all five asset-relevant operations in a normal fulfillment proposal: delivery outbound, possession, pickup return, inspection, and cleaning. It evaluates those candidates together against the asset’s existing world line.

The toy is pure and asset-only. It does not check runners, select assets, reserve anything, persist assignments, calculate costs, or create offers. It supersedes EXIS1, which remains available as a historical toy.

Input is JSON containing `asset`, a valid `proposal`, and resolved `points` and `spacePoints`. Output is `{ "feasible": boolean }` with a canonical reason when infeasible.
