# AlgZoo typed causal result enforcement

- Unexpected hurdle: the first focused evaluator found a formatter warning in the dependency-free test validator.
- Diagnosis: the test adapter must model the strict `tested` and `not-tested` record shapes without requiring Zod in the test environment.
- Fix: validate the schema branches in a small test-only adapter; make the pilot runner require an injected validator and classify missing or malformed records before scoring, retaining metered cost and failure code.
- Next-time guidance: keep legacy interpretability schema optionality intact; exercise both causal-result variants through the injected adapter and confirm invalid attempts remain invalid in blinded scoring.
- Scope boundary: no provider calls, model inference, pilot execution, held-out access, or spend.
