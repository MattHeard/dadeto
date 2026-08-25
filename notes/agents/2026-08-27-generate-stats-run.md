# Mutation loop: generate-stats/run

- Unexpected hurdle: Stryker initially failed because this ESM test maps Firebase modules to test mocks that were omitted from the sandbox; later retries also exposed intermittent child-process listener failures.
- Diagnosis: including both Firebase mock files and the runtime HTML asset produced a valid 12-test dry run and authoritative mutation report.
- Fix: added isolated repeated-call assertions for each Firestore cache identity component and an exact `createGenerateStatsCore` dependency assertion.
- Evidence: final Stryker scan instrumented 47 mutants with 38 killed, 9 ignored, 0 survived, and 0 timed out; focused ESM Jest passed 12 tests.
- Next-time guidance: include every Jest `moduleNameMapper` target in narrowed Stryker file lists, especially for ESM `unstable_mockModule` suites.
