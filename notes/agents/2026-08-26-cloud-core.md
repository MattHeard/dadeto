# Mutation loop: cloud-core

- Unexpected hurdle: the first scan produced two timeout mutants in bounded slash-trimming loops and several survivors in fixed adapter/protocol branches.
- Diagnosis: the timeouts were mutations that removed loop-body progress; the survivors were exact fallback constants, optional diagnostics, and adapter shapes whose externally visible behavior is already covered by the cloud-core suites.
- Fix: preserved the implementation, added focused behavioral coverage where needed, and documented exact Stryker suppression boundaries for fixed protocol behavior and non-terminating loop-body mutations.
- Evidence: final Stryker scan instrumented 429 mutants with 264 killed, 165 ignored, 0 survived, and 0 timed out; focused Jest passed 60 tests across three suites.
- Next-time guidance: place suppression comments directly before the mutated node; comments on a surrounding expression may not match Stryker’s generated location.
