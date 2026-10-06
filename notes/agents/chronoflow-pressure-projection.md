# Chronoflow pressure projection

- Unexpected hurdle: the existing solver calls its head-driven flux “pressure,” but it had no pressure solve and could leave a divergent cell-centered velocity field.
- Diagnosis: the original solve mixed averaged cell-centered divergence with a right/down face pressure gradient, so increasing iteration count could not converge. Adopt one consistent outgoing/incoming face-normal divergence with impermeable solid and outer faces.
- Chosen fix: retain a deterministic 24-iteration Jacobi pressure solve and correct its divergence and wall-face operators. The 32×20 regression reduces RMS divergence by over 80%; a 600-step 8×6 closed-field regression checks replay, bounds, volume, and divergence.
- Next-time guidance: warmed target-grid step timings were about 3.3–4.6 ms locally. Re-measure on constrained browsers before increasing grid size or pressure iteration count; the solver remains a puzzle-scale approximation.
