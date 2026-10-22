# THREEFOLD crowded 2×2 conflict oracle — 2026-10-22

- Unexpected hurdle: projection already handled a single 2×2 footprint and layout exposed pairwise conflicts, but no fixture combined multiple fine objects crowding one coarse cell.
- Diagnosis: four quarter-base bounds remain separate at scale −1 and each rounds into the same 1×1 cell at scale 0.
- Fix: assert exact fine cells, all six stable unresolved coarse pairs, permutation stability, and unchanged canonical bounds; record the case in acceptance and harness.
- Next guidance: implement a packing policy only when the live spec requires authored placement decisions; preserve explicit conflicts until that decision exists, then continue with scale-specific group interactions and narrow-mobile visual smoke.
