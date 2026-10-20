# Atlas held-out scoring and causal-evidence boundary

## Unexpected hurdle

The AlgZoo pilot runner accepts an injected blinded scorer and returns its scores separately from the investigator session records. Its sessions also retain `predictions`, `causalEvidence`, and the hypothesis text as distinct submission fields, but existing tests did not pin down that boundary.

## Diagnosis

The runner provides a safe handoff: held-out data is passed to the scorer, not the investigator, and the blinded results are returned separately. There is no concrete deterministic local-prediction scorer implementation yet, so the integration seam alone does not complete the Rank 4 held-out evaluation acceptance criterion.

## Chosen fix

Strengthened the pilot-runner regression to assert that held-out score records are returned separately, investigator sessions preserve their prediction and explicit `not tested` causal-evidence fields independently from hypothesis text, and scores are not written into the session submission. The test uses injected deterministic doubles and does not launch the preregistered pilot.

## Evidence

- `npm run test:impact -- --files test/core/interpretability/algZooPilotHarness.test.js` passed 1 suite / 11 tests.
- The complete `npm run check` result and exact-head CI will be recorded after the note-inclusive validation and push.
- No live investigator, held-out disclosure, model inference, external storage, or deployment occurred.

## Next-time guidance

Do not treat the adapter boundary as a scientific evaluator. Before marking the spec criterion complete, implement and validate the frozen deterministic held-out prediction scorer and represent any causal-intervention result separately from the post-hoc hypothesis.
