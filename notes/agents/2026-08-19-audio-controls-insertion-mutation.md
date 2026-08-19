# Audio-controls insertion mutation slice

- Unexpected hurdle: the existing test covered insertion when a parent exists but not the no-parent branch.
- Diagnosis: the conditional at `insertControlsAfterAudio` could be replaced with an unconditional insertion without any assertion failing.
- Chosen fix: added a setup-level negative-path test that verifies `insertBefore` is not called when the audio element has no parent.
- Evidence: the final Stryker scan for `src/core/browser/audio-controls.js:175-179` killed all 3 mutants with 0 survivors and 0 timeouts; the focused Jest suite passed 28 tests, targeted ESLint passed with zero warnings, and `git diff --check` passed.
- Next-time guidance: pair DOM insertion tests with both a valid parent and absent-parent case when a guard controls whether insertion occurs.
