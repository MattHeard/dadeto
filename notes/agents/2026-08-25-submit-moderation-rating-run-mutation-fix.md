# Mutation scan: submit-moderation-rating run

- Unexpected hurdle: two wrapper mutants survived because the test checked only returned exports and regional registration.
- Diagnosis: the POST route path and dependency construction were not asserted at the Express boundary.
- Fix: asserted exact POST route registration and calls to auth/environment dependency providers.
- Evidence: final focused scan killed all 8 mutants with no survivors or timeouts; 1 focused test passed.
- Next-time guidance: assert route registration and dependency-provider calls in cloud entrypoint tests.
