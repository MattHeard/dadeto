## Unexpected hurdle
While exercising the `createPageContext` branch I initially stubbed the page reference with a minimal object. Jest quickly exposed that the real code chains `collection('variants').orderBy(...).limit(...).get()`, so my stub lacked the `orderBy`/`limit` chain and threw mid-test. The fix was to reuse the existing test helpers (`createVariantCollection`/`createVariantDoc`) to mirror the Firestore collection structure. Future branch-specific tests should prefer these helpers over ad-hoc stubs to avoid missing required methods.

## What I’d do differently next time
Before wiring complex Firestore flows, review downstream calls (especially chaining operations) so the mock surface matches reality on the first attempt. Keeping a reference flowchart of Firestore interactions for this module would make it easier to spot which methods the mocks need.

## Open questions
Should we extract a shared mock factory for Firestore collections/documents across tests? Several suites duplicate similar scaffolding, and centralising it might keep future branch-coverage pushes from reinventing the same chains.

## Additional surprise while covering render-variant
While extending coverage for `render-variant-core`, I initially forgot that downstream metadata helpers expect the page snapshot returned from `pageRef.get()` to expose its own `ref`. The test blew up with "Cannot read properties of undefined (reading 'parent')" when the resolver tried to walk back to the story document. The fix was simply to echo the real Firestore behaviour by attaching the originating ref to the fake snapshot before handing it back. When mocking parent lookups, double-check whether callers dereference `.ref` on returned snapshots.

## Generate-stats helper gotcha
The stats core pulls the metadata access token before it even looks at the path list, so trying to assert that an empty `invalidatePaths` call never hits the metadata endpoint fails. The right fix is either to override the dependency in the test or accept that metadata will always be fetched. When covering helpers built this way, review the implementation first so you don’t encode assumptions the code doesn’t make.
