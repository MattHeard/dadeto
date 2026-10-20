# Portable Atlas V1 + V2 research bundle

- Unexpected hurdle: the aggregate check initially rejected the bundle API's generic JSDoc schema type because the reused V1 importer requires all six named schema adapters.
- Diagnosis: `importEvidenceGraphV1` already enforces the precise injected schema contract; the new outer API documentation had erased those required keys as a generic record.
- Fix: document the six V1 schema properties explicitly and compose the existing V1 export/import and V2 identity validator behind the established parser boundary. Add a dependency-free bundle round-trip test using the existing test Zod double.
- Evidence: focused impact and scoped coverage passed for `src/core/interpretability/index.js` and `test/core/interpretability/researchBundleV2.test.js`. `npm run check` passed all 10 gates, including all five fallback test shards (7,241 tests) and zero clones.
- Next-time guidance: preserve dependency injection types in JSDoc when composing validated subgraphs. Run `npm run tsdoc:check` early; it catches an erased schema contract before the full aggregate gate. Rank 4 still needs a concrete evidence-reuse research loop and its native-neuron acceptance.
