# Chronoflow pressure projection

- Unexpected hurdle: the existing solver calls its head-driven flux “pressure,” but it had no pressure solve and could leave a divergent cell-centered velocity field.
- Diagnosis: define divergence from the same averaged neighboring face velocities used by the finite-volume flow, omitting solid interfaces as impermeable boundaries; test a varied 2D field and the authored puzzle witnesses.
- Chosen fix: add a deterministic 24-iteration Jacobi pressure solve and velocity-gradient projection. A 600-step 8×6 closed-field regression checks replay, bounds, volume, and RMS divergence.
- Next-time guidance: projection improves the specified discrete divergence but does not yet implement semi-Lagrangian velocity advection. Add that as a separate measured loop, and revisit pressure iteration cost before scaling toward the spec’s 32×20 target.
