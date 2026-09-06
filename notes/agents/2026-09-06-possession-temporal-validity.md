# Possession temporal validity

- Unexpected hurdle: the first repository check was blocked by sandbox child-process `EPERM`, and the strict coverage gate exposed one uncovered default-argument branch.
- Diagnosis path: reran the gate with child-process execution allowed, inspected the coverage branch map, and identified the uncalled no-argument validator path.
- Chosen fix: validate normalized delivery/pickup timestamps before runner commitment reads and add a focused missing-context case without changing coverage thresholds.
- Next-time guidance: use the structured `npm run check` summary, distinguish sandbox `EPERM` from repository failures, and inspect coverage branch maps when a new pure guard drops the strict threshold.
