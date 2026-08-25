# Mutation scan: get-moderation-variant cors facade

- Unexpected hurdle: the target is a one-line forwarding wrapper around the scanned core policy.
- Diagnosis: Stryker produced one facade-boundary mutant with no independent behavior.
- Fix: no source change was needed; recorded the forwarding boundary and focused policy tests.
- Evidence: 0 non-static survivors and 4 focused tests passed.
- Next-time guidance: scan the shared moderation CORS implementation separately from this facade.
