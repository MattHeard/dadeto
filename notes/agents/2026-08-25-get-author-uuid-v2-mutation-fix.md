# Mutation scan: get-author-uuid-v2-core

- Unexpected hurdle: one collection-name string mutant survived because the test double accepted any collection.
- Diagnosis: behavior was asserted at the response level but not at the Firestore adapter boundary.
- Fix: asserted the fixed `authors` collection and verified the UID document key.
- Evidence: final focused scan killed all 26 mutants with no survivors or timeouts; the focused suite passed 5 tests.
- Next-time guidance: assert persistence collection names and document identifiers in adapter-backed handlers.
