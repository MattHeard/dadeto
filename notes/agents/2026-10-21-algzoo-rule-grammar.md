# AlgZoo restricted prediction-rule grammar

## Unexpected hurdle

The frozen pilot protocol required an executable rule with a 64-node limit and referred to “specified prefix reductions,” but neither the JSON syntax nor the allowed reductions were defined in the repository.

## Diagnosis

The pilot runner delegated scoring to an injected adapter, and no implementation or prior Bead defined a rule parser. The protocol has no assigned targets or outcomes, so its change-control rule permits a versioned clarification before launch.

## Chosen fix

Bumped the preregistration to version 1.0.1 and defined a strict JSON AST with finite constants, zero-based time, bounded input indexing, arithmetic, comparisons, ReLU, binary max, and inclusive prefix sum/mean/max/min. The document now defines node counting, exact comparison semantics, and invalid-prediction behavior. The pilot schedule and manifest report the same version; malformed protocol hashes remain rejected.

## Evidence

- `npm run test:impact -- --files test/core/interpretability/algZooPilotHarness.test.js` passed 1 suite / 11 tests.
- The final local aggregate check and workflow runs are tracked in Bead `dadeto-0anp`.
- No pilot assignment, outcome access, held-out disclosure, or model inference occurred.

## Next-time guidance

Implement the AST evaluator and held-out scorer against synthetic data first. Keep causal-intervention outcomes in a separate structured field, then run the preregistration's access-control and launch-readiness checks; do not start assignments until the evaluator is concrete and versioned.
