## Unexpected hurdle
While exercising the `createPageContext` branch I initially stubbed the page reference with a minimal object. Jest quickly exposed that the real code chains `collection('variants').orderBy(...).limit(...).get()`, so my stub lacked the `orderBy`/`limit` chain and threw mid-test. The fix was to reuse the existing test helpers (`createVariantCollection`/`createVariantDoc`) to mirror the Firestore collection structure. Future branch-specific tests should prefer these helpers over ad-hoc stubs to avoid missing required methods.

## What I’d do differently next time
Before wiring complex Firestore flows, review downstream calls (especially chaining operations) so the mock surface matches reality on the first attempt. Keeping a reference flowchart of Firestore interactions for this module would make it easier to spot which methods the mocks need.

## Open questions
Should we extract a shared mock factory for Firestore collections/documents across tests? Several suites duplicate similar scaffolding, and centralising it might keep future branch-coverage pushes from reinventing the same chains.
