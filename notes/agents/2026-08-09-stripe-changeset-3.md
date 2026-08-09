# Stripe billing changeset 3

- Unexpected hurdle: the in-memory Firestore test double does not implement the `<=` query operator required by the production query shape.
- Diagnosis: current-snapshot selection is deterministic by UTC ISO ordering, so a bounded ordered read plus injected-clock filter preserves the same semantics and works across the real and fake Firestore boundaries.
- Chosen fix: added pure catalog seed/idempotency core, explicit test seed CLI, document-ID validation, package mutation support, append-only snapshot conflict detection, and effective-at filtering.
- Next-time guidance: keep business catalog writes behind the seed core; add the public offer endpoint and checkout wiring in the frontend changeset.
