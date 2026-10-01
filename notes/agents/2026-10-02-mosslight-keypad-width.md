# Handheld keypad width

The shared `.dendrite-form > div` selector overrode the keypad's flex display,
stacking the controls vertically. Use a more specific keypad selector, full-width
form and border-box grid with named D-pad, face and system areas. Keep the mobile
size rules on that same specific selector.

Evidence: focused styles/keypad Jest tests pass 10 tests; `npm run build` passes
(`/tmp/dadeto-keypad-build.log`); phone and desktop Playwright layout regressions
pass 2 tests (`/tmp/dadeto-keypad-playwright.log`). Aggregate check output is
`/tmp/dadeto-keypad-check.log`; existing hardening failures belong to dadeto-aaou.
