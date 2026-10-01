# Mosslight virtual keypad

- Unexpected hurdle: the full repository check exposed two generated-HTML tests whose expected input-method lists lagged behind the current generator.
- Diagnosis: the registered keypad correctly appeared in generated forms; only the complete-page expectations were stale.
- Fix: added the `mosslight-keypad` input handler, one-tap keyboard event mapping, responsive handheld styling, game default, and focused unit/mobile browser coverage; updated generated-HTML expectations.
- Evidence: full `npm run check` passed all 10 gates with 100% coverage and zero skipped lines; local Mosslight Playwright passed 3 tests with 3 expected project skips; build and `git diff --check` passed.
- Next-time guidance: when introducing a Dadeto input method, search for complete generated HTML assertions and update both phone and desktop E2E expectations before the aggregate check.
