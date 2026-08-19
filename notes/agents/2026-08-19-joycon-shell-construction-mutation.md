# JoyCon handler-shell construction mutation slice

- Unexpected hurdle: the initial status label is written again during the first render, so a missing constructor text option was masked by the later render update.
- Diagnosis: the handler-shell test verified only that a form was inserted, leaving the exact hero, status, dot, and status-text construction behavior unobservable.
- Chosen fix: record created element identities, assert the exact construction tags and class/text effects, and require two distinct `Waiting for gamepad` writes for initialization plus first render.
- Evidence: the final Stryker scan for `src/core/browser/inputHandlers/joyConMapper.js:2271-2280` instrumented 12 mutants and killed all 12 with 0 survivors and 0 timeouts; the focused Jest suite passed 95 tests, targeted ESLint passed with zero warnings, and `git diff --check` passed.
- Next-time guidance: when initialization is immediately followed by a rendering pass, assert write counts or event order so constructor behavior cannot be hidden by the first update.
