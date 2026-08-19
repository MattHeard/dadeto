# JoyCon reset-handler mutation slice

- Unexpected hurdle: the reset handler initially had seven uncovered survivors because no test invoked its boundary; after adding a behavioral test, 6/7 mutants were killed and the remaining `ArrayDeclaration` was `NoCoverage` for the null-device fallback.
- Diagnosis: the main test covered stale-device filtering but not the `state.hidDevices ?? []` fallback.
- Chosen fix: added a second reset invocation with `hidDevices: null` to exercise that fallback.
- Evidence: focused Jest passed 92 tests, ESLint passed with zero warnings, and the diff check passed. The verified Stryker scan killed 7/7 mutants with 0 survivors, 0 timeouts, and no `NoCoverage` results.
- Next-time guidance: retain both stale-device and null-device cases when testing reset-state fallbacks.
