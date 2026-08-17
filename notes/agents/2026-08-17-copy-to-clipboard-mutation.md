# Copy-to-clipboard mutation loop

- The dedicated suite now covers initial rendering, successful copy feedback, repeated clicks, timer reset, clipboard failure, and missing navigator behavior.
- Stryker sandbox runs initially reported false survivors with `testsCompleted: 0`; validated in-place runs corrected the source/test boundary.
- Stryker workers could leave instrumented source after interruption. Jest now force-exits only under `STRYKER_TEST_ENV` so mutation workers clean up reliably.
- The current focused scan reached 2 of 44 mutants with 0 survivors and 0 timeouts before being stopped for resource control; full-file verification remains open.
