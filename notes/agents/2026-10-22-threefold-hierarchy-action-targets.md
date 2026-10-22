# THREEFOLD scale-specific hierarchy action targets — 2026-10-22

- Unexpected hurdle: renderer hierarchy exposed coarse proxies and child identities, but there was no shared pure contract for turning the identity visible at the player's interaction scale into the complete set of authored entities an action may affect.
- Diagnosis: existing scene reducers use explicit per-interaction reach and scale checks; renderer zoom alone is not an action. The new contract therefore stays pure and returns identities without mutating simulation state or executing an effect.
- Chosen fix: `resolveHierarchyActionTarget` rejects hidden and unknown targets, maps a visible composite to itself plus stable sorted descendants, and maps a visible leaf to itself. Nested building→wall→crack and 3×3 crate-pile regressions cover scale thresholds, order stability, and source immutability.
- Next-time guidance: gameplay reducers should pass the current player interaction scale and apply effects only to the returned authored identities; do not let camera zoom commit actions or infer groups from proximity/overlap. This slice does not wire new gameplay behavior.
