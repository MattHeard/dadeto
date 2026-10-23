# AlgZoo protocol version alignment

- Unexpected hurdle: the schedule and generated manifest reported protocol 1.0.3 while the frozen preregistration declared 1.0.4.
- Diagnosis: the schedule owned a hard-coded version string; the manifest copied it, so both artifacts could drift from the preregistration together.
- Fix: define one current protocol-version constant for schedule generation and make the harness regression read the preregistration's declared version, checking both schedule and manifest against it.
- Next-time guidance: preserve earlier protocol semantics in the specification; change this current-version constant only when a new frozen protocol explicitly authorizes a version bump.
