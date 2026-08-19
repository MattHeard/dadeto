# JoyCon reset-handler mutation slice

- Unexpected hurdle: the reset handler initially had seven uncovered survivors because no test invoked its boundary; after adding a behavioral test, 6/7 mutants were killed and the remaining `ArrayDeclaration` was `NoCoverage` for the null-device fallback.
- Diagnosis: the main test covered stale-device filtering but not the `state.hidDevices ?? []` fallback.
- Chosen fix: added a second reset invocation with `hidDevices: null` to exercise that fallback.
- Evidence: focused Jest passed 92 tests, ESLint passed with zero warnings, and the diff check passed. The post-fix Stryker rerun could not complete: escalated permission review timed out twice, and the non-escalated attempt failed with `listen EPERM` before mutation execution.
- Next-time guidance: rerun the reset slice with the required process/network permission and confirm 7/7 killed before closing this slice.
