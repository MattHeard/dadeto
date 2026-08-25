# Mutation scan: submit-moderation-rating dependencies

- Unexpected hurdle: one collection-name string mutant survived because the Firestore test double accepted every collection name.
- Diagnosis: persistence behavior was asserted, but the adapter collection contract was not.
- Fix: asserted both the `moderators` and `moderationRatings` collection names.
- Evidence: final scan killed 39 mutants, ignored 1 static boundary mutant, and left 0 survivors or timeouts; 3 tests passed.
- Next-time guidance: assert collection names whenever a dependency wrapper uses multiple Firestore collections.
