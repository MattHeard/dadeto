# Atlas context lineage response

## Loop result

`createInterpretabilityResearchServiceV1.readContext` now returns the validated V2 lineage link matching the requested V1 mechanism. Native Pythia context includes only its canonical component link; recurrent context retains its component and activation-position link. A V2 bundle has no V3 lineage and returns `mechanismIdentityLink: null`. Existing context fields, import errors, unknown-mechanism errors, and storage-token forwarding remain intact.

## Unexpected hurdle and diagnosis

The first implementation extracted a named `readContext` helper that directly invoked the evidence parser. `core-parse` classified it as parsing logic in the core service layer. A generic JSDoc typedef also proved unsupported by the project's lint rules. The fix keeps the existing `withBundle` adapter boundary, enriches only its successful context callback, and uses an inline JSDoc template for the helper's result type. This preserves the service's parse boundary and exposes the new result shape without weakening type checking.

## Evidence

- `npm run check:impact:run -- --files src/core/interpretability/researchService.js test/core/interpretability/researchServiceV1.test.js` — passed; 8 suites / 68 tests, no uncovered changed-core lines or branches, ESLint/core-parse/duplication passed, 0 clones.
- `npm run check` — passed all 10 gates; 8 related suites / 68 tests, 0 failures, duplication 0 clones.
- Exact-head Full Check and Terraform Validate — record the run IDs in Bead `dadeto-u15c` and the Rank 4 Notion spec after push.

## Next-time guidance

When adding data to a service response, preserve the established import/permission wrapper and extend the validated result after the domain query succeeds. Keep evidence parsing inside the existing boundary path instead of introducing a named core helper that appears to own parsing.
