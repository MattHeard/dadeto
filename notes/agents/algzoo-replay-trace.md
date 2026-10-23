# Complete AlgZoo activation replay trace

- Unexpected hurdle: the first focused core-parse gate rejected input and tensor validation added directly to the replay module.
- Diagnosis: `src/core` must keep interpretation at the boundary; the repository parse gate correctly identified those checks as parsing.
- Fix: keep the recurrent calculation pure in core and move sequence, tensor, and index validation to a thin local adapter. The trace is time-major and exposes all 10 × 16 activations; the existing scalar calculation remains available.
- Next-time guidance: run `npm run core-parse` early when adding validation to core APIs; put untrusted or malformed input checks in a boundary module.
- Scope boundary: only the checked-in pinned fixture and a deterministic synthetic input are used; no real pilot, provider, inference, held-out access, or spend.
