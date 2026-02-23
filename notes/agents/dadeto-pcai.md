# dadeto-pcai

- Unexpected: `npm test` keeps failing because `test/core/cloud/process-new-page/process-new-page-core.test.js` never reaches the branches that call `pageDocRef.get`, leaving several expectations unmet. Rerunning the suite after my changes reproduces the failure, so it looks like an existing mocking issue rather than something I introduced; follow-up would be to exercise that handler or re-baseline the mocks so the page lookup runs.
- Learning: the new auto-submit checkbox needs a per-toy listener tracker to avoid registering the same input handler multiple times, so I stored a single remover and keyed it off the checkbox state. That pattern keeps the checkbox self-contained and lets us deregister cleanly when unchecked.
- Follow-up idea: keep an eye on the cloud process-new-page handler test and ensure the snapshot builders still supply the `pageDocRef` data so those expectations can be honored (the current failure signal might hide a deeper mock drift).
