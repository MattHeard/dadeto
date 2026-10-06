# Chronoflow witness capacity proof

- Unexpected hurdle: the Archive Entry witness test already proved target completion and generic volume bounds, but it did not explicitly assert the route valve and sluice state or that the decoy route actually sends water into the drain.
- Diagnosis: compare the unchecked acceptance items with the authored command witness and its existing replay test; the behavior was present, while the test contract was incomplete.
- Chosen fix: make the witness test assert archive route selection, an open sluice, both open route cells, target delivery, and per-cell [0, 1] limits; make the decoy assertion prove drain accumulation and zero target delivery. Record those guarantees in acceptance and harness docs.
- Next-time guidance: keep puzzle acceptance tied to explicit runtime state and fluid invariants, not only a final `completed` flag.
