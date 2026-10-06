# Chronoflow projection convergence at target resolution

- Unexpected hurdle: raising Jacobi iterations from 24 to 96 cost about 39 ms on a cold 32×20 step yet barely reduced the measured divergence.
- Diagnosis: divergence averaged neighboring cell velocities while pressure correction operated on stored right/down faces. Those operators did not compose into the Poisson stencil, so iteration count could not fix convergence.
- Chosen fix: define divergence from outgoing/incoming right/down face velocities, zero outer and solid-adjacent normal faces, and keep the matching nearest-neighbor pressure gradient. The fixed 24-iteration solve now reduces the deterministic target field from RMS 33.97 to 0.42 (98.8%); warmed local steps measured about 3.3–4.6 ms. The active-flow E2E checks velocity before the target settles.
- Next-time guidance: preserve the face convention in solver metrics and remeasure target-grid timing on real browsers before scaling resolution. Keep settled-state and active-flow UI assertions separate.
