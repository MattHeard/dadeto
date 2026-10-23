# AlgZoo activation trace CLI

- Unexpected hurdle: Core-parse and thin-boundary checks prohibit putting fixture validation in `src/core` or expanding the local adapter beyond a small boundary.
- Diagnosis: The trace calculation belongs in pure core; fixture identity and seed validation belong in the local execution boundary.
- Chosen fix: Keep `src/core/interpretability/algZooReplay.js` pure, validate the fixture in a small local module, and make the documented CLI explicitly report deterministic replay-only evidence.
- Next-time guidance: Do not treat replay from the pinned fixture as pilot data or a model inference result; preserve seed reproducibility and reject invalid inputs before writing stdout.
