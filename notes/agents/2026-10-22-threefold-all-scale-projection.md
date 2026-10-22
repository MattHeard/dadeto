# THREEFOLD all-scale logical projection — 2026-10-22

- Unexpected hurdle: the scale argument supports nine values, but direct projection tests sampled only the base and one finer scale.
- Diagnosis: renderer coverage across regions did not establish the pure projection's dimensions for varied positive footprints at each supported scale.
- Chosen fix: add generated rectangular fixtures at scales −4 through +4, asserting exact snapped bounds, integer dimensions, repeat stability, and unchanged source geometry; document the remaining spatial gate as open.
- Next-time guidance: treat this as a projection regression only. General deterministic packing/conflict policy, authored semantic resolution and physical-causality acceptance still need separate evidence-backed loops.
