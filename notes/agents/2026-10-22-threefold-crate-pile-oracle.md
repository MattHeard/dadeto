# THREEFOLD crate-pile geometry oracle — 2026-10-22

- Unexpected hurdle: the live spatial contract names both a coarse 3×3 crate pile and a nested building→wall→crack, while only the latter had an exact geometry fixture.
- Diagnosis: `resolveSceneLayout` already exposes authored hierarchy and cell bounds, so the missing evidence could be added without inventing a second packing model.
- Fix: add a 3×3 parent/child fixture proving one coarse proxy, nine distinct fine cells, stable results under input permutation, and immutable source geometry; map the remaining group-action requirement as open.
- Next guidance: connect exposed identities to actual authored interaction paths and test group effects before claiming composite interactions complete; continue with crowding/capacity and physical-growth causality separately.
