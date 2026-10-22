# Portable Atlas V2 identity graph

- Unexpected hurdle: the first module split failed the core parse-boundary gate, and a local adapter exceeded the repository's thin-wrapper limit.
- Diagnosis: this existing interpretability entrypoint is the approved parser boundary; standalone modules under the ordinary interpretability directory are classified as raw-input parsers.
- Fix: keep the injected graph schema, canonical relationship checks, and JSON import/export beside the existing V1 graph boundary in `src/core/interpretability/index.js`. The test-only schema double keeps the suite independent of the runtime Zod package.
- Evidence: focused impact check passed 5 suites / 47 tests, zero clones, no changed-core coverage gaps. `npm run check` passed all 10 gates.
- Next-time guidance: run `npm run core-parse` and the scoped coverage check early when adding graph serialization. Rank 4 still needs portable integration with the V1 evidence/hypothesis graph and broader evidence reuse before its native-neuron acceptance can be claimed.
