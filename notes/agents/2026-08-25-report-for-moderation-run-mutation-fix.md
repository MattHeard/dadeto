# Mutation scan: report-for-moderation run

- Unexpected hurdle: one object-literal mutant survived because the wrapper test checked only the CORS option shape, not the configured origin behavior.
- Diagnosis: the target must pass the production allowlist into the CORS predicate, not merely configure POST methods.
- Fix: invoked the captured CORS origin callback for an allowed and denied production origin and asserted both outcomes.
- Evidence: final focused scan killed all 16 mutants with no survivors or timeouts; two focused suites passed.
- Next-time guidance: exercise captured middleware callbacks, including both allow and deny paths, in cloud wrapper tests.
