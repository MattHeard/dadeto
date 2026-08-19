# JoyCon runtime-initialization mutation slice

- Unexpected hurdle: the initializer scan initially left seven survivors because registration callbacks and disposal were only indirectly covered.
- Diagnosis: aggregate lifecycle assertions did not make individual click callbacks observable.
- Chosen fix: added an initializer integration test that invokes start, skip, and reset handlers independently, verifies polling and animation setup, and exercises form disposal.
- Evidence: the verified Stryker scan killed 7/7 mutants with 0 survivors and 0 timeouts; the focused Jest suite passed 94 tests, ESLint passed with zero warnings, and the diff check passed.
- Next-time guidance: assert each registered callback’s behavior separately when mutation testing orchestration code.
