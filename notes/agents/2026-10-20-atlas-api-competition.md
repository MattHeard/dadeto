# Atlas competing-evidence service API regression

## Unexpected hurdle

The Atlas graph presenter and portable viewer already had regressions for two competing hypotheses, positive and negative evidence, and `supports`/`contradicts` relationships. The permission-aware research service had bounded-read coverage, but its API regression did not prove that those distinctions survived the service boundary.

## Diagnosis

`createInterpretabilityResearchServiceV1.readContext` delegates to the validated evidence-graph context query. That query returns typed records and relationship edges in one bounded `items` collection; callers must be able to distinguish each record by its collection and preserve the edge relation.

## Chosen fix

Added a service-level regression with two hypotheses and separate observation and negative evidence records. The test reads the graph through the service API and asserts both hypothesis IDs, both evidence kinds, and `supports` plus `contradicts` edges remain distinct. Existing browser-viewer coverage verifies those same concepts appear in separate UI sections. All fixtures use the local Zod test double and deterministic in-memory storage.

## Evidence

- `npm run test:impact -- --files test/core/interpretability/researchServiceV1.test.js` passed 1 suite / 9 tests.
- `npm run check` passed all 10 fast gates with the focused service suite selected; duplication reported 0 clones and audit found 0 vulnerabilities.
- No network inference, external storage, or deployment was used.

## Next-time guidance

When the service API returns a typed heterogeneous context list, test the service boundary directly for collection identity and edge relations. A viewer-only test does not prove that API callers retain the same competing interpretations.
