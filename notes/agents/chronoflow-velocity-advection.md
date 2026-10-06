# Chronoflow velocity advection

- Unexpected hurdle: a pulse in a stationary field is not a good directional-advection test; with no carrier speed, downstream stagnant cells do not backtrace upstream.
- Diagnosis: isolate semi-Lagrangian sampling from pressure projection and use a uniform horizontal carrier with a localized vertical-velocity feature. The full game journey separately guards route completion.
- Chosen fix: backtrace each free cell by its velocity and fixed `dt`, clamp the sample point to the grid, bilinearly sample fluid cells only, then run the existing pressure projection. The fixed speed/time bounds make a separate segment-versus-solid scan unreachable, so remove that dead branch.
- Next-time guidance: velocity displacement is currently limited by normalized speed × `dt` (at most 0.1 cell per step); test a higher resolution and representative long-running authored levels before increasing speed or changing units. This is a puzzle-scale approximation, not scientific CFD.
